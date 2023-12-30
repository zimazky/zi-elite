import { Mat2, Vec2 } from "./vectors";
import { mat2, vec2 } from "gl-matrix";

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

describe('Mat2.MulVecLeft', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat2.RAND;
    const v2 = Vec2.RAND;
    test((a: Mat2, b: Vec2)=>{
      const re = a.mulVecLeft(b);
      const ta = mat2.fromValues(a.i.x, a.j.x, a.i.y, a.j.y);
      mat2.transpose(ta, ta);
      const tb = vec2.fromValues(b.x, b.y);
      const tr = vec2.create();
      vec2.transformMat2(tr, tb, ta);
      const ex = Vec2.fromArray(tr);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'v2', arg: v2},
    ]);
  }
})

describe('Mat2.MulVec', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat2.RAND;
    const v2 = Vec2.RAND;
    test((a: Mat2, b: Vec2)=>{
      const re = a.mulVec(b);
      const ta = mat2.fromValues(a.i.x, a.j.x, a.i.y, a.j.y);
      const tb = vec2.fromValues(b.x, b.y);
      const tr = vec2.create();
      vec2.transformMat2(tr, tb, ta);
      const ex = Vec2.fromArray(tr);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'v2', arg: v2},
    ]);
  }
})

describe('Mat2.MulMatLeft', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat2.RAND;
    const m2 = Mat2.RAND;
    test((a: Mat2, b: Mat2)=>{
      const re = a.mulMatLeft(b);
      const ta = mat2.fromValues(a.i.x, a.j.x, a.i.y, a.j.y);
      const tb = mat2.fromValues(b.i.x, b.j.x, b.i.y, b.j.y);
      const tr = mat2.create();
      mat2.mul(tr, tb, ta);
      const ex = Mat2.fromArray(tr);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'm2', arg: m2},
    ]);
  }
})

describe('Mat2.MulMat', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat2.RAND;
    const m2 = Mat2.RAND;
    test((a: Mat2, b: Mat2)=>{
      const re = a.mulMat(b);
      const ta = mat2.fromValues(a.i.x, a.j.x, a.i.y, a.j.y);
      const tb = mat2.fromValues(b.i.x, b.j.x, b.i.y, b.j.y);
      const tr = mat2.create();
      mat2.mul(tr, ta, tb);
      const ex = Mat2.fromArray(tr);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'm2', arg: m2},
    ]);
  }
})

describe('Mat2.fromRotation', ()=>{
  for(let i = 0; i < 100; i++) {
    const theta = Math.random()*100.;
    test((t:number)=>{
      const re = Mat2.fromRotation(t)
      const m = mat2.create();
      mat2.rotate(m,m,t);
      const ex = Mat2.fromArray(m);
      const equal = re.equals(ex)
      expect(equal).toEqual(true)
      //expect(re).toEqual(ex)
    }, [
        { name: 'theta', arg: theta }
      ]
    )
  }
})
