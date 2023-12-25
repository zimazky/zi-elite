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


// ----------------------------------------------------------------------------
// Vec3
/*
  get xyx(): Vec3 { return new Vec3(this.x, this.y, this.x) }
  get yxx(): Vec3 { return new Vec3(this.y, this.x, this.x) }
  get xyy(): Vec3 { return new Vec3(this.x, this.y, this.y) }
  get yxy(): Vec3 { return new Vec3(this.y, this.x, this.y) }
  get yyx(): Vec3 { return new Vec3(this.y, this.y, this.x) }
  get xxz(): Vec3 { return new Vec3(this.x, this.x, this.z) }
  get xzx(): Vec3 { return new Vec3(this.x, this.z, this.x) }
  get zxx(): Vec3 { return new Vec3(this.z, this.x, this.x) }
  get xzz(): Vec3 { return new Vec3(this.x, this.z, this.z) }
  get zxz(): Vec3 { return new Vec3(this.z, this.x, this.z) }
  get zzx(): Vec3 { return new Vec3(this.z, this.z, this.x) }
  get yyz(): Vec3 { return new Vec3(this.y, this.y, this.z) }
  get yzy(): Vec3 { return new Vec3(this.y, this.z, this.y) }
  get zyy(): Vec3 { return new Vec3(this.z, this.y, this.y) }
  get yzz(): Vec3 { return new Vec3(this.y, this.z, this.z) }
  get zyz(): Vec3 { return new Vec3(this.z, this.y, this.z) }
  get zzy(): Vec3 { return new Vec3(this.z, this.z, this.y) }
  get xxx(): Vec3 { return new Vec3(this.x, this.x, this.x) }
  get yyy(): Vec3 { return new Vec3(this.y, this.y, this.y) }
  get zzz(): Vec3 { return new Vec3(this.z, this.z, this.z) }
*/

describe('Vec3.xyz', ()=>{
  for(let i = 0; i < 100; i++) {
    const v = Vec3.RAND;
    test((a: Vec3)=>{
      const re = a.xyz;
      const ex = new Vec3(a.x,a.y,a.z);
      expect(re).toEqual(ex)
    }, [{name: 'vector', arg: v}]);
  }
})

describe('Vec3.xzy', ()=>{
  for(let i = 0; i < 100; i++) {
    const v = Vec3.RAND;
    test((a: Vec3)=>{
      const re = a.xzy;
      const ex = new Vec3(a.x,a.z,a.y);
      expect(re).toEqual(ex)
    }, [{name: 'vector', arg: v}]);
  }
})

describe('Vec3.yzx', ()=>{
  for(let i = 0; i < 100; i++) {
    const v = Vec3.RAND;
    test((a: Vec3)=>{
      const re = a.yzx;
      const ex = new Vec3(a.y,a.z,a.x);
      expect(re).toEqual(ex)
    }, [{name: 'vector', arg: v}]);
  }
})

describe('Vec3.yxz', ()=>{
  for(let i = 0; i < 100; i++) {
    const v = Vec3.RAND;
    test((a: Vec3)=>{
      const re = a.yxz;
      const ex = new Vec3(a.y,a.x,a.z);
      expect(re).toEqual(ex)
    }, [{name: 'vector', arg: v}]);
  }
})

describe('Vec3.zxy', ()=>{
  for(let i = 0; i < 100; i++) {
    const v = Vec3.RAND;
    test((a: Vec3)=>{
      const re = a.zxy;
      const ex = new Vec3(a.z,a.x,a.y);
      expect(re).toEqual(ex)
    }, [{name: 'vector', arg: v}]);
  }
})

describe('Vec3.zyx', ()=>{
  for(let i = 0; i < 100; i++) {
    const v = Vec3.RAND;
    test((a: Vec3)=>{
      const re = a.zyx;
      const ex = new Vec3(a.z,a.y,a.x);
      expect(re).toEqual(ex)
    }, [{name: 'vector', arg: v}]);
  }
})

describe('Vec3.xxy', ()=>{
  for(let i = 0; i < 100; i++) {
    const v = Vec3.RAND;
    test((a: Vec3)=>{
      const re = a.xxy;
      const ex = new Vec3(a.x,a.x,a.y);
      expect(re).toEqual(ex)
    }, [{name: 'vector', arg: v}]);
  }
})

describe('Vec3.xyx', ()=>{
  for(let i = 0; i < 100; i++) {
    const v = Vec3.RAND;
    test((a: Vec3)=>{
      const re = a.xyx;
      const ex = new Vec3(a.x,a.y,a.x);
      expect(re).toEqual(ex)
    }, [{name: 'vector', arg: v}]);
  }
})

















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


