import { Vec3 } from "./vectors";
import { vec3 } from "gl-matrix";

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


describe('Vec3.normalize', ()=>{
  for(let i = 0; i < 100; i++) {
    const v = Vec3.RAND;
    test((a: Vec3)=>{
      const re = a.normalize();
      const len = Math.sqrt(a.x*a.x+a.y*a.y+a.z*a.z);
      const ex = new Vec3(a.x/len,a.y/len,a.z/len);
      expect(re).toEqual(ex)
    }, [{name: 'vector', arg: v}]);
  }
})

describe('Vec3.cross', ()=>{
  for(let i = 0; i < 100; i++) {
    const v1 = Vec3.RAND;
    const v2 = Vec3.RAND;
    test((a: Vec3, b: Vec3)=>{
      const re = a.cross(b);
      const ta = vec3.fromValues(a.x, a.y, a.z);
      const tb = vec3.fromValues(b.x, b.y, b.z);
      const tr = vec3.create();
      vec3.cross(tr, ta, tb);
      const ex = new Vec3(tr[0],tr[1],tr[2]);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'v1', arg: v1},
      {name: 'v2', arg: v2},
    ]);
  }
})


