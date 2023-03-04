import { Camera } from './core/camera';
import { Engine } from './core/engine'
import { initKeyBuffer } from './core/keyboard';
import { VEC3_ZERO } from './core/vectors';
import loadImage from './utils/loadimg';

export default async function main() {

  const e = new Engine('glcanvas');

  let cameraPositionLocation: WebGLUniformLocation; // Положение камеры xyz, w - высота над поверхностью
  let cameraViewAngleLocation: WebGLUniformLocation; // Угол объектива камеры по x координате
  let cameraVelocityLocation: WebGLUniformLocation; // Скорость камеры xyz
  let cameraOrientationLocation: WebGLUniformLocation; // Кватернион, определяющий 
  let cameraAngularSpeedLocation: WebGLUniformLocation;
  let screenModeLocation: WebGLUniformLocation;
  let mapScaleLocation: WebGLUniformLocation;

  initKeyBuffer();

  const camera = new Camera(VEC3_ZERO);

  const img = await loadImage('textures/gray_noise.png');

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
  }
  
  e.start();
  
}