import { Quaternion, Vec3 } from "./vectors";
import { mat4, quat, vec3 } from "gl-matrix";

type TestParameters = { name: string, arg: any }[]


/**
 * Функция для замыкания аргументов внутри функции без аргументов
 * @param f функция для вызова
 * @param args аргументы, передаваемые в функцию f
 * @returns функция без аргументов
 */
function callf(f: (...args: any[])=>void, ...args:any[]) {
  return ()=>{ f(...args) }
}

function test(f: (...args: any[])=>void, args: TestParameters) {
  // наименование теста
  let title = 'test';
  let newargs: any[] = [];
  // параметры теста
  for(let i=0; i<args.length; i++) {
    title += ` ${args[i].name}=${args[i].arg}`;
    newargs.push(args[i].arg);
  }
  it(title, callf (f, ...newargs)
  )
}

describe('Quaternion.fromLookAt', ()=>{
  for(let i = 0; i < 100; i++) {
    const from = Vec3.RAND.mulMutable(100);
    const to = Vec3.RAND.mulMutable(100);
    const up = Vec3.RAND.normalize();
    test((f: Vec3, t: Vec3, u: Vec3)=>{
      const re = Quaternion.fromLookAt(f,t,u);
      const m = mat4.create();
      const from = vec3.create();
      vec3.set(from, f.x, f.y, f.z);
      const to = vec3.create();
      vec3.set(to, t.x, t.y, t.z);
      const up = vec3.create();
      vec3.set(up, u.x, u.y, u.z);
      mat4.lookAt(m,from,to,up);
      const q = quat.create();
      mat4.getRotation(q, m);
      const ex = new Quaternion(q[0], q[1], q[2], q[3]);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'from', arg: from},
      {name: 'to', arg: to},
      {name: 'up', arg: up}
    ]);
  }
})


describe('Quaternion.fromAxisAngle', ()=>{
  for(let i = 0; i < 100; i++) {
    const axis = Vec3.RAND;
    const theta = Math.random()*100.;
    test((a: Vec3, t:number)=>{
      const re = Quaternion.fromAxisAngle(a,t)
      const v = vec3.create();
      vec3.set(v,a.x,a.y,a.z);
      //vec3.normalize(v,v);
      const q = quat.create();
      quat.setAxisAngle(q, v, t);
      const ex = new Quaternion(q[0], q[1], q[2], q[3]);
      const equal = re.equals(ex)
      expect(equal).toEqual(true)
      //expect(re).toEqual(ex)
    }, [
        { name: 'axis', arg: axis },
        { name: 'theta', arg: theta }
      ]
    )
  }
})

describe('Quaternion.fromEuler', ()=>{
  for(let i = 0; i < 100; i++) {
    const axis = Vec3.RAND;
    test((a: Vec3)=>{
      const re = Quaternion.fromEuler(a.x, a.y, a.z)
      const q = quat.create();
      quat.fromEuler(q, a.x, a.y, a.z);
      const ex = new Quaternion(q[0], q[1], q[2], q[3]);
      const equal = re.equals(ex)
      expect(equal).toEqual(true)
      //expect(re).toEqual(ex)
    }, [
        { name: 'Vec3', arg: axis }
      ]
    )
  }
})
