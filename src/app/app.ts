import { Atmosphere } from 'src/core/Atmosphere/Atmosphere';
import { Camera } from 'src/core/camera';
import { Engine, Renderbufer } from 'src/core/engine'
import { Flare } from 'src/core/flare';
import { initKeyBuffer } from 'src/shared/libs/keyboard';
import { NoiseSampler } from 'src/core/Noise/NoiseSampler';
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
import { RidgedFbmNoise } from 'src/core/Noise/RidgedFbmNoise';
import { CubeSphereFbmTerrain } from 'src/core/Terrain/CubeSphereFbm';
import { FlatFbmTerrain } from 'src/core/Terrain/FlatFbm';
import { InigoQuilezFBMNoise } from 'src/core/Noise/InigoQuilezFBMNoise';

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

/*
/////////////////////////////////////////////////////////////////

  const img = NoiseImg.createBWNoiseImage(256,256,'apples')
  const divCanvas = document.getElementById('canvas')!;
  divCanvas.appendChild(img);

/////////////////////////////////////////////////////////////////
*/

  const e = new Engine('glcanvas');
  let infoRefreshTime = 0;
  let positionStoreTime = 0;


  initKeyBuffer();

  const grayNoiseImg = await loadImage('textures/gray_noise.png');
  const blueNoiseImg = await loadImage('textures/blue_noise.png');
  const milkywayImg = await loadImage('textures/starmap_2020_16k_gal.jpg');
  const constellationImg = await loadImage('textures/constellation_figures_8k_gal.jpg');
  
  const planet = new Planet(500000, 9.81); //6371e3
  const nSampler = new NoiseSampler(grayNoiseImg);
  const noise = new InigoQuilezFBMNoise(nSampler);
  //const noise = new RidgedFbmNoise(nSampler);
  //const tSampler = new FlatFbmTerrain(planet, noise);
  const tSampler = new CubeSphereFbmTerrain(planet, noise);

  const json = localStorage.getItem('ziEliteData') ?? '{}';
  console.log('localStorage', json);
  const obj = JSON.parse(json);
  
  // одна из предустановленных точек
  //let pos = new Vec3(2316,0,7696);
  let pos = new Vec3(100,3000,100);
  //let pos = new Vec3(45070.29149266565, 53646.0613676151, -83641.67299722403)
  //let pos=new Vec3(359021.48294928856,-135761.44854442962,-263875.832753025)

  //let quat = new Quaternion(0,-0.9908125427905498,0,0.13524239368232574);
  //let pos = new Vec3(127857.9675744353,-4410.132631224615,732644.718708906);
  //let quat = new Quaternion(0.08401592608814235,0.4728007576980472,0.4222206424740206,-0.7688501133202295);
  
  //let pos = Vec3.ZERO();
  //let pos = new Vec3(0,12000000,0);
  let quat = Quaternion.ID;
  if(obj.position !== undefined) pos = new Vec3(obj.position.x, obj.position.y, obj.position.z);
  if(obj.orientation !== undefined) quat = new Quaternion(obj.orientation.x, obj.orientation.y, obj.orientation.z, obj.orientation.w);
  const camera = new Camera(pos, quat, tSampler, planet);
  const atm = new Atmosphere(planet);
  const sky = new Sky(camera, atm, tSampler);
  const flare1 = new Flare(camera, planet);
  const flare2 = new Flare(camera, planet);

  const o = new ObjDoc();
  await o.init('models/cobra3.obj');

  // инициализируем и определяем размер холста по размеру дисплея для определения размера буферов
  e.resizeCanvasToDisplaySize();

  // Шейдер оценки глубины по предыдущему кадру
  const shaderA = e.addFramebufferMRT(
    e.canvas.width, e.canvas.height, [{format: WebGL2RenderingContext.R32F}],
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
    e.canvas.width, e.canvas.height, [
      {format: WebGL2RenderingContext.R32F},
      {format: WebGL2RenderingContext.RGBA16F},
      {format: WebGL2RenderingContext.RGBA16F}
    ],
    //2195, 1131, 2,
    vshaderB, fshaderB,
    (shader) => {
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
      const lla = tSampler.lonLatAlt(camera.position);

      divInfo.innerText = `dt: ${dt.toFixed(2)} fps: ${(1000/dt).toFixed(2)} ${width}x${height}
      shB: ${widthB}x${heightB} nA: ${nxA}x${nyA}
      v: ${v.toFixed(2)}m/s (${vkmph.toFixed(2)}km/h)
      alt: ${camera.altitude.toFixed(2)} h: ${camera.terrainElevation.toFixed(2)}
      lat: ${grad(lla.x).toFixed(7)} lon: ${grad(lla.y).toFixed(7)}
      x: ${camera.position.x.toFixed(2)} y: ${camera.position.y.toFixed(2)} z: ${camera.position.z.toFixed(2)}
      sun: ${sky.sunDiscColor.x.toFixed(2)} ${sky.sunDiscColor.y.toFixed(2)} ${sky.sunDiscColor.z.toFixed(2)}
      nx: ${camera.normal.x.toFixed(2)} ny: ${camera.normal.y.toFixed(2)} nz: ${camera.normal.z.toFixed(2)}
      rx: ${camera.ir.x.toFixed(2)} ry: ${camera.ir.y.toFixed(2)} rz: ${camera.ir.z.toFixed(2)}
      vx: ${camera.velocity.x.toFixed(2)} vy: ${camera.velocity.y.toFixed(2)} vz: ${camera.velocity.z.toFixed(2)}
      `;

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