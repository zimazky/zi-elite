import { Atmosphere } from './core/atmosphere';
import { Camera } from './core/camera';
import { Engine, Renderbufer } from './core/engine'
import { Flare } from './core/flare';
import { initKeyBuffer } from './core/keyboard';
import { NoiseSampler } from './core/noise';
import { Quaternion } from './core/quaternion';
import { Sky } from './core/sky';
import { TerrainSampler } from './core/terrain';
import { Vec3 } from './core/vectors';
import { ProgramA } from './programs/programA';
import { ProgramB } from './programs/programB';
import { ProgramRender } from './programs/programRender';
import { loadImage } from './utils/loadimg';

import vshaderA from '../shaders/a/vs.glsl';
import fshaderA from '../shaders/a/fs.glsl';
import vshaderB from '../shaders/b/vs.glsl';
import fshaderB from '../shaders/b/fs.glsl';
import vshaderR from '../shaders/render1/vs.glsl';
import fshaderR from '../shaders/render1/fs.glsl';

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
  const e = new Engine('glcanvas');
  let infoRefreshTime = 0;
  let positionStoreTime = 0;


  initKeyBuffer();

  const grayNoiseImg = await loadImage('textures/gray_noise.png');
  const blueNoiseImg = await loadImage('textures/blue_noise.png');
  const milkywayImg = await loadImage('textures/starmap_2020_16k_gal.jpg');
  const constellationImg = await loadImage('textures/constellation_figures_8k_gal.jpg');
  
  const tSampler = new TerrainSampler(new NoiseSampler(grayNoiseImg));

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
  const camera = new Camera(pos, quat, tSampler);
  const atm = new Atmosphere();
  const sky = new Sky(camera, atm);
  const flare1 = new Flare(camera);
  const flare2 = new Flare(camera);

  // инициализируем и определяем размер холста по размеру дисплея для определения размера буферов
  e.resizeCanvasToDisplaySize();

  const shaderA = e.addFramebufferMRT(
    e.canvas.width, e.canvas.height, 1,
    //2195, 1131, 1,
    vshaderA, fshaderA,
    (shader) => {
      programA.init(shader);
    },
    (time: number, timeDelta: number) => {
      programA.update();
    }
  );

  const shaderB = e.addFramebufferMRT(
    e.canvas.width, e.canvas.height, 2,
    //2195, 1131, 2,
    vshaderB, fshaderB,
    (shader: Renderbufer) => {
      programB.init(shader, grayNoiseImg);
    },
    (time: number, timeDelta: number) => {
      programB.update(time, timeDelta);
    }
  );

  const programA = new ProgramA(e, shaderB, camera);
  const programB = new ProgramB(e, shaderA, camera, atm);
  const programRender = new ProgramRender(e, shaderA, shaderB, camera, atm, sky, flare1, flare2);

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


      divInfo.innerText = `dt: ${dt.toFixed(2)} fps: ${(1000/dt).toFixed(2)} ${width}x${height}
      shB: ${widthB}x${heightB} nA: ${nxA}x${nyA}
      v: ${v.toFixed(2)}m/s (${vkmph.toFixed(2)}km/h)
      alt: ${camera.altitude.toFixed(2)} h: ${camera.position.y.toFixed(2)}
      x: ${camera.position.x.toFixed(2)} y: ${camera.position.z.toFixed(2)}
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

  e.start();
  
}