import { Atmosphere } from 'src/core/atmosphere';
import { Camera } from 'src/core/camera';
import { Engine, Renderbufer } from 'src/core/engine'
import { Flare } from 'src/core/flare';
import { initKeyBuffer } from 'src/shared/libs/keyboard';
import { NoiseSampler } from 'src/core/noise';
import { Sky } from 'src/core/sky';
import { Quaternion, Vec3 } from 'src/shared/libs/vectors';
import { ProgramA } from 'src/programs/programA';
import { ProgramB } from 'src/programs/programB';
import { ProgramRender } from 'src/programs/programRender';
import { loadImage } from 'src/shared/utils/loadimg';

import vshaderA from 'src/shaders/a/vs.glsl';
import fshaderA from 'src/shaders/a/fs.glsl';
import vshaderB from 'src/shaders/b/vs.glsl';
import fshaderB from 'src/shaders/b/fs.glsl';
import vshaderC from 'src/shaders/c/vs.glsl';
import fshaderC from 'src/shaders/c/fs.glsl';
import vshaderR from 'src/shaders/render1/vs.glsl';
import fshaderR from 'src/shaders/render1/fs.glsl';

import { ObjDoc } from 'src/core/loadobj';
import { ProgramC } from 'src/programs/programC/programC';
import { Planet } from 'src/core/planet';
import { grad } from 'src/shared/libs/mathutils';
import { SphericalPyramidsTerrain } from 'src/core/Terrain/SphericalPyramids';
import { CubeSpherePyramidsTerrain } from 'src/core/Terrain/CubeSpherePyramids';
import { FlatPyramidsTerrain } from 'src/core/Terrain/FlatPyramids';

//-----------------------------------------------------------------------------
// TODO: 
//   1. Облака
//   2. Наложить ландшафт на сферическую поверхность планеты
//   3. Добавить водные поверхности
//   4. +Рендерить в отдельный буфер (с картой расстояний) для последующей постобработки
//   5. +Продумать об использовании буфера предыдущего кадра для ускорения рендеринга нового
//   6. Продумать возможность аналитического вычисления нормалей к поверхности
//   7. Правильно расположить небесный свод относительно планеты
//   8. +Поправить цвета материалов, структурировать работу с материалами
//   9. +Вынести расчет атмосферы в отдельный шейдер
//  10. +Включить проверку глубины при отрисовке предварительного буфера
//  11. Вычислять тени в отдельном шейдере
//  12. Добавить отображение летающих объектов, управляемых AI
//  13. Исправить работу с данными предыдущего кадра при изменении угла обзора

//-----------------------------------------------------------------------------
// Новый алгоритм (НЕ РЕШЕН ВОПРОС ДИНАМИЧЕСКОЙ СЕТКИ)
// 1. В первом шейдере создаем карту высот и нормалей в полярных координатах.
//    Выполняем не в каждом кадре, только при больших смещениях.
//    Можно использовать предыдущую карту для ускорения.
// 2. Во втором шейдере, на основании карты высот создаем карту теней и карту цвета освещения.
//    В полярных координатах.
//    Выполняем не в каждом кадре, при больших смещениях солнца.
// 3. В третьем шейдере формируем полигоны на основании карты высот и отрисовываем кадр.

export default async function main() {

  const divInfo = document.getElementById('info');
  if(divInfo === null)  throw new Error('Не найден блок id="info"');
  const loaderIndicator = document.getElementById('loader_indicator');
  if(loaderIndicator === null)  throw new Error('Не найден блок id="loader_indicator"');

  const e = new Engine('glcanvas');
  let infoRefreshTime = 0;
  let positionStoreTime = 0;


  initKeyBuffer();

  const grayNoiseImg = await loadImage('textures/gray_noise.png');
  const blueNoiseImg = await loadImage('textures/blue_noise.png');
  const milkywayImg = await loadImage('textures/starmap_2020_16k_gal.jpg');
  const constellationImg = await loadImage('textures/constellation_figures_8k_gal.jpg');
  
  const planet = new Planet(100000, 9.81); //6371e3
  const tSampler = new CubeSpherePyramidsTerrain(planet);

  const json = localStorage.getItem('ziEliteData') ?? '{}';
  console.log('localStorage', json);
  const obj = JSON.parse(json);
  
  // одна из предустановленных точек
  let pos = new Vec3(2316,0,7696);
  let quat = new Quaternion(0,-0.9908125427905498,0,0.13524239368232574);

  //let pos = Vec3.ZERO();
  //let pos = new Vec3(0,12000000,0);
  //let quat = Quaternion.Identity();
  //if(obj.position !== undefined) pos = new Vec3(obj.position.x, obj.position.y, obj.position.z);
  //if(obj.orientation !== undefined) quat = new Quaternion(obj.orientation.x, obj.orientation.y, obj.orientation.z, obj.orientation.w);
  const camera = new Camera(pos, quat, tSampler, planet);
  const atm = new Atmosphere(planet);
  const sky = new Sky(camera, atm);
  const flare1 = new Flare(camera, planet);
  const flare2 = new Flare(camera, planet);

  const o = new ObjDoc();
  await o.init('models/cobra3.obj');

  // инициализируем и определяем размер холста по размеру дисплея для определения размера буферов
  e.resizeCanvasToDisplaySize();

  // Шейдер оценки глубины по предыдущему кадру
  const shaderA = e.addFramebufferMRT(
    e.canvas.width, e.canvas.height, [{format: 'RGBA16F'}],
    //2195, 1131, 1,
    vshaderA, fshaderA,
    (shader) => {
      programA.init(shader);
    },
    (time: number, timeDelta: number) => {
      programA.update();
    }
  );

  // Шейдер формирования G-буфера
  const shaderB = e.addFramebufferMRT(
    e.canvas.width, e.canvas.height, [{format: 'RGBA16F'}, {format: 'RGBA16F'}],
    //2195, 1131, 2,
    vshaderB, fshaderB,
    (shader: Renderbufer) => {
      programB.init(shader, grayNoiseImg);
    },
    (time: number, timeDelta: number) => {
      programB.update(time, timeDelta);
    }
  );

/*
  // Шейдер отрисовки полигональных объектов
  const shaderC = e.addFramebufferMRT(
    e.canvas.width, e.canvas.height, 1,
    vshaderC, fshaderC,
    (shader: Renderbufer) => {
      programC.init(shader, o);
    },
    (time: number, timeDelta: number) => {
      programC.update(time, timeDelta);
    }
  )
*/
  const programA = new ProgramA(e, shaderB, camera);
  const programB = new ProgramB(e, shaderA, camera, atm);
//  const programC = new ProgramC(e, camera);
  const programRender = new ProgramRender(e, shaderA, shaderB/*, shaderC*/, camera, atm, sky, flare1, flare2);

  e.setRenderbuffer(vshaderR, fshaderR,
    (shader)=>{
      programRender.init(shader, blueNoiseImg, milkywayImg, constellationImg, grayNoiseImg);
    },
    (time: number, timeDelta: number) => {
      programRender.update(time, timeDelta);
    }
  );


  e.onUpdate = (time, timeDelta) => {
    camera.loopCalculation(time, timeDelta);
    sky.loopCalculation(time, timeDelta);
    flare1.update(time, timeDelta);
    flare2.update(time, timeDelta);

    // Вывод информации на экран с периодичностью 0.5 сек
    if(time>infoRefreshTime) {
      const dt = timeDelta*1000;
      const v = camera.velocity.length();
      const vkmph = v*3.6;
      const width = e.canvas.width.toFixed(0);
      const height = e.canvas.height.toFixed(0);
      const widthB = shaderB.width.toFixed(0);
      const heightB = shaderB.height.toFixed(0);
      const nxA = programA.numX.toFixed(0);
      const nyA = programA.numY.toFixed(0);
      const lla = planet.lonLatAlt(camera.position);

      divInfo.innerText = `dt: ${dt.toFixed(2)} fps: ${(1000/dt).toFixed(2)} ${width}x${height}
      shB: ${widthB}x${heightB} nA: ${nxA}x${nyA}
      v: ${v.toFixed(2)}m/s (${vkmph.toFixed(2)}km/h)
      alt: ${camera.altitude.toFixed(2)} h: ${tSampler.height(camera.position).toFixed(2)}
      lat: ${grad(lla.x).toFixed(7)} lon: ${grad(lla.y).toFixed(7)}
      x: ${camera.position.x.toFixed(2)} y: ${camera.position.y.toFixed(2)} z: ${camera.position.z.toFixed(2)}
      sun: ${sky.sunDiscColor.x.toFixed(2)} ${sky.sunDiscColor.y.toFixed(2)} ${sky.sunDiscColor.z.toFixed(2)}`;

      infoRefreshTime = time + 0.5;
    }

    if(time>positionStoreTime) {
      // Сохранение координат в локальное хранилище каждые 5 секунд
      const dataString = JSON.stringify({ position: camera.position, orientation: camera.orientation });
      localStorage.setItem('ziEliteData', dataString);
      positionStoreTime = time + 5.;
    }
  }
  loaderIndicator.style.display = 'none';
  e.start();
  
}