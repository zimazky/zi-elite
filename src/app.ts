import { Camera } from './core/camera';
import { Engine } from './core/engine'
import { initKeyBuffer } from './core/keyboard';
import { TerrainSampler } from './core/terrain';
import { Vec3 } from './core/vectors';
import { loadImage } from './utils/loadimg';

export default async function main() {

  const divInfo = document.getElementById('info');
  const e = new Engine('glcanvas');
  let nextTime = 0;

  let cameraPositionLocation: WebGLUniformLocation; // Положение камеры xyz, w - высота над поверхностью
  let cameraViewAngleLocation: WebGLUniformLocation; // Угол объектива камеры по x координате
  let cameraVelocityLocation: WebGLUniformLocation; // Скорость камеры xyz
  let cameraOrientationLocation: WebGLUniformLocation; // Кватернион, определяющий 
  let cameraAngularSpeedLocation: WebGLUniformLocation;
  let screenModeLocation: WebGLUniformLocation;
  let mapScaleLocation: WebGLUniformLocation;

  initKeyBuffer();

  const img = await loadImage('textures/gray_noise.png');
  const tSampler = new TerrainSampler(img);
  const camera = new Camera(Vec3.ZERO(), tSampler);

  e.onProgramInit = (program) => {
    cameraPositionLocation = e.getUniformLocation(program, 'uCameraPosition');
    cameraViewAngleLocation = e.getUniformLocation(program, 'uCameraViewAngle');
    cameraVelocityLocation = e.getUniformLocation(program, 'uCameraVelocity');
    cameraOrientationLocation = e.getUniformLocation(program, 'uCameraQuaternion');
    cameraAngularSpeedLocation = e.getUniformLocation(program, 'uCameraRotationSpeed');
    screenModeLocation = e.getUniformLocation(program, 'uScreenMode');
    mapScaleLocation = e.getUniformLocation(program, 'uMapScale');

    e.setTexture(program, 'uTexture', img);
  }
  
  e.onProgramLoop = (time, timeDelta) => {
    camera.loopCalculation(time, timeDelta);
    e.gl.uniform4f(cameraPositionLocation, camera.position.x, camera.position.y, camera.position.z, camera.altitude);
    e.gl.uniform3f(cameraVelocityLocation, camera.velocity.x, camera.velocity.y, camera.velocity.z);
    e.gl.uniform3f(cameraAngularSpeedLocation, camera.angularSpeed.x, camera.angularSpeed.y, camera.angularSpeed.z);
    e.gl.uniform4f(cameraOrientationLocation, camera.orientation.x, camera.orientation.y, camera.orientation.z, camera.orientation.w);
    e.gl.uniform1f(cameraViewAngleLocation, camera.viewAngle);

    if(time>nextTime) {
      const dt = timeDelta*1000;
      const v = camera.velocity.length();
      const vkmph = v*3.6;
      const width = e.canvas.width.toFixed(0);
      const height = e.canvas.height.toFixed(0);
      divInfo.innerText = `dt: ${dt.toFixed(2)} fps: ${(1000/dt).toFixed(2)} ${width}x${height}
      v: ${v.toFixed(2)}m/s (${vkmph.toFixed(2)}km/h)
      alt: ${camera.altitude.toFixed(2)} h: ${camera.position.y.toFixed(2)}
      x: ${camera.position.x.toFixed(2)} y: ${camera.position.z.toFixed(2)}`;
      nextTime = time + 0.5;
    }

    //console.log(camera);
  }
  
  e.start();
  
}