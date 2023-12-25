import { Mat2, Mat3, Mat4, Quaternion, Vec2, Vec3, Vec4 } from "./vectors";
import { mat2, mat3, mat4, quat, vec2, vec3, vec4 } from "gl-matrix";

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
// Mat2

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
      const ex = new Vec2(tr[0],tr[1]);
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
      const ex = new Vec2(tr[0],tr[1]);
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
      const ex = new Mat2(new Vec2(tr[0],tr[2]), new Vec2(tr[1],tr[3]));
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
      const ex = new Mat2(new Vec2(tr[0],tr[2]), new Vec2(tr[1],tr[3]));
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'm2', arg: m2},
    ]);
  }
})

// ----------------------------------------------------------------------------
// Mat3

describe('Mat3.MulVecLeft', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat3.RAND;
    const v2 = Vec3.RAND;
    test((a: Mat3, b: Vec3)=>{
      const re = a.mulVecLeft(b);
      const ta = mat3.fromValues(
        a.i.x, a.j.x, a.k.x,
        a.i.y, a.j.y, a.k.y,
        a.i.z, a.j.z, a.k.z
        );
      mat3.transpose(ta, ta);
      const tb = vec3.fromValues(b.x, b.y, b.z);
      const tr = vec3.create();
      vec3.transformMat3(tr, tb, ta);
      const ex = new Vec3(tr[0],tr[1],tr[2]);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'v2', arg: v2},
    ]);
  }
})

describe('Mat3.MulVec', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat3.RAND;
    const v2 = Vec3.RAND;
    test((a: Mat3, b: Vec3)=>{
      const re = a.mulVec(b);
      const ta = mat3.fromValues(
        a.i.x, a.j.x, a.k.x,
        a.i.y, a.j.y, a.k.y,
        a.i.z, a.j.z, a.k.z
        );
      const tb = vec3.fromValues(b.x, b.y, b.z);
      const tr = vec3.create();
      vec3.transformMat3(tr, tb, ta);
      const ex = new Vec3(tr[0],tr[1],tr[2]);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'v2', arg: v2},
    ]);
  }
})

describe('Mat3.MulMatLeft', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat3.RAND;
    const m2 = Mat3.RAND;
    test((a: Mat3, b: Mat3)=>{
      const re = a.mulMatLeft(b);
      const ta = mat3.fromValues(a.i.x, a.j.x, a.k.x, a.i.y, a.j.y, a.k.y, a.i.z, a.j.z, a.k.z);
      const tb = mat3.fromValues(b.i.x, b.j.x, b.k.x, b.i.y, b.j.y, b.k.y, b.i.z, b.j.z, b.k.z);
      const tr = mat3.create();
      mat3.mul(tr, tb, ta);
      const ex = new Mat3(new Vec3(tr[0],tr[3],tr[6]), new Vec3(tr[1],tr[4],tr[7]), new Vec3(tr[2],tr[5],tr[8]));
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'm2', arg: m2},
    ]);
  }
})

describe('Mat3.MulMat', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat3.RAND;
    const m2 = Mat3.RAND;
    test((a: Mat3, b: Mat3)=>{
      const re = a.mulMat(b);
      const ta = mat3.fromValues(a.i.x, a.j.x, a.k.x, a.i.y, a.j.y, a.k.y, a.i.z, a.j.z, a.k.z);
      const tb = mat3.fromValues(b.i.x, b.j.x, b.k.x, b.i.y, b.j.y, b.k.y, b.i.z, b.j.z, b.k.z);
      const tr = mat3.create();
      mat3.mul(tr, ta, tb);
      const ex = new Mat3(new Vec3(tr[0],tr[3],tr[6]), new Vec3(tr[1],tr[4],tr[7]), new Vec3(tr[2],tr[5],tr[8]));
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'm2', arg: m2},
    ]);
  }
})

// ----------------------------------------------------------------------------
// Mat4

describe('Mat4.MulVecLeft', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat4.RAND;
    const v2 = Vec4.RAND;
    test((a: Mat4, b: Vec4)=>{
      const re = a.mulVecLeft(b);
      const ta = mat4.fromValues(
        a.i.x, a.j.x, a.k.x, a.l.x,
        a.i.y, a.j.y, a.k.y, a.l.y,
        a.i.z, a.j.z, a.k.z, a.l.z,
        a.i.w, a.j.w, a.k.w, a.l.w
        );
      mat4.transpose(ta, ta);
      const tb = vec4.fromValues(b.x, b.y, b.z, b.w);
      const tr = vec4.create();
      vec4.transformMat4(tr, tb, ta);
      const ex = new Vec4(tr[0],tr[1],tr[2],tr[3]);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'v2', arg: v2},
    ]);
  }
})

describe('Mat4.MulVec', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat4.RAND;
    const v2 = Vec4.RAND;
    test((a: Mat4, b: Vec4)=>{
      const re = a.mulVec(b);
      const ta = mat4.fromValues(
        a.i.x, a.j.x, a.k.x, a.l.x,
        a.i.y, a.j.y, a.k.y, a.l.y,
        a.i.z, a.j.z, a.k.z, a.l.z,
        a.i.w, a.j.w, a.k.w, a.l.w
        );
      const tb = vec4.fromValues(b.x, b.y, b.z, b.w);
      const tr = vec4.create();
      vec4.transformMat4(tr, tb, ta);
      const ex = new Vec4(tr[0],tr[1],tr[2],tr[3]);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'v2', arg: v2},
    ]);
  }
})

describe('Mat4.MulMatLeft', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat4.RAND;
    const m2 = Mat4.RAND;
    test((a: Mat4, b: Mat4)=>{
      const re = a.mulMatLeft(b);
      const ta = mat4.fromValues(
        a.i.x, a.j.x, a.k.x, a.l.x,
        a.i.y, a.j.y, a.k.y, a.l.y,
        a.i.z, a.j.z, a.k.z, a.l.z,
        a.i.w, a.j.w, a.k.w, a.l.w
        );
      const tb = mat4.fromValues(
        b.i.x, b.j.x, b.k.x, b.l.x,
        b.i.y, b.j.y, b.k.y, b.l.y,
        b.i.z, b.j.z, b.k.z, b.l.z,
        b.i.w, b.j.w, b.k.w, b.l.w
        );
      const tr = mat4.create();
      mat4.mul(tr, tb, ta);
      const ex = new Mat4(
        new Vec4(tr[0],tr[4],tr[8],tr[12]),
        new Vec4(tr[1],tr[5],tr[9],tr[13]),
        new Vec4(tr[2],tr[6],tr[10],tr[14]),
        new Vec4(tr[3],tr[7],tr[11],tr[15])
        );
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'm2', arg: m2},
    ]);
  }
})

describe('Mat4.MulMat', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat4.RAND;
    const m2 = Mat4.RAND;
    test((a: Mat4, b: Mat4)=>{
      const re = a.mulMat(b);
      const ta = mat4.fromValues(
        a.i.x, a.j.x, a.k.x, a.l.x,
        a.i.y, a.j.y, a.k.y, a.l.y,
        a.i.z, a.j.z, a.k.z, a.l.z,
        a.i.w, a.j.w, a.k.w, a.l.w
        );
      const tb = mat4.fromValues(
        b.i.x, b.j.x, b.k.x, b.l.x,
        b.i.y, b.j.y, b.k.y, b.l.y,
        b.i.z, b.j.z, b.k.z, b.l.z,
        b.i.w, b.j.w, b.k.w, b.l.w
        );
      const tr = mat4.create();
      mat4.mul(tr, ta, tb);
      const ex = new Mat4(
        new Vec4(tr[0],tr[4],tr[8],tr[12]),
        new Vec4(tr[1],tr[5],tr[9],tr[13]),
        new Vec4(tr[2],tr[6],tr[10],tr[14]),
        new Vec4(tr[3],tr[7],tr[11],tr[15])
        );
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'm2', arg: m2},
    ]);
  }
})

describe('Mat4.fromAxisAngle', ()=>{
  for(let i = 0; i < 100; i++) {
    const axis = Vec3.RAND;
    const theta = Math.random()*100.;
    test((a: Vec3, t:number)=>{
      const re = Mat4.fromAxisAngle(a,t)
      const m = mat4.create();
      const v = vec3.create();
      vec3.set(v,a.x,a.y,a.z);
      mat4.rotate(m,m,t,v);
      const ex = Mat4.fromArray(m);
      const equal = re.equals(ex)
      expect(equal).toEqual(true)
    }, [
        { name: 'axis', arg: axis },
        { name: 'theta', arg: theta }
      ]
    )
  }
})

describe('Mat4.perspectiveGl', ()=>{
  for(let i = 0; i < 100; i++) {
    const fovy = Math.random()*0.5;
    const aspect = Math.random()*2;
    const near = Math.random();
    const far = 1 + Math.random()*10;
    test((f: number, a: number, zn: number, zf: number)=>{
      const re = Mat4.perspectiveGl(f,a,zn,zf);
      const m = mat4.create();
      mat4.perspectiveNO(m,f,a,zn,zf);
      const ex = Mat4.fromArray(m);
      const equal = re.equals(ex)
      expect(equal).toEqual(true)
    }, [
      {name: 'fovy', arg: fovy},
      {name: 'aspect', arg: aspect},
      {name: 'near', arg: near},
      {name: 'far', arg: far}
    ]);
  }
})

describe('Mat4.perspectiveDx', ()=>{
  for(let i = 0; i < 100; i++) {
    const fovy = Math.random()*0.5;
    const aspect = Math.random()*2;
    const near = Math.random();
    const far = 1 + Math.random()*10;
    test((f: number, a: number, zn: number, zf: number)=>{
      const re = Mat4.perspectiveDx(f,a,zn,zf);
      const m = mat4.create();
      mat4.perspectiveZO(m,f,a,zn,zf);
      const ex = Mat4.fromArray(m);
      const equal = re.equals(ex)
      expect(equal).toEqual(true)
    }, [
      {name: 'fovy', arg: fovy},
      {name: 'aspect', arg: aspect},
      {name: 'near', arg: near},
      {name: 'far', arg: far}
    ]);
  }
})

describe('Mat4.orthoGl', ()=>{
  for(let i = 0; i < 100; i++) {
    const left = -Math.random()*100;
    const right = Math.random()*100;
    const bottom = -Math.random()*100;
    const top = Math.random()*100;
    const near = Math.random();
    const far = 1 + Math.random()*10;
    test((l: number, r: number, b: number, t: number, zn: number, zf: number)=>{
      const re = Mat4.orthoGl(l,r,b,t,zn,zf);
      const m = mat4.create();
      mat4.orthoNO(m,l,r,b,t,zn,zf);
      const ex = Mat4.fromArray(m);
      const equal = re.equals(ex)
      expect(equal).toEqual(true)
    }, [
      {name: 'left', arg: left},
      {name: 'right', arg: right},
      {name: 'bottom', arg: bottom},
      {name: 'top', arg: top},
      {name: 'near', arg: near},
      {name: 'far', arg: far}
    ]);
  }
})

describe('Mat4.orthoDx', ()=>{
  for(let i = 0; i < 100; i++) {
    const left = -Math.random()*100;
    const right = Math.random()*100;
    const bottom = -Math.random()*100;
    const top = Math.random()*100;
    const near = Math.random();
    const far = 1 + Math.random()*10;
    test((l: number, r: number, b: number, t: number, zn: number, zf: number)=>{
      const re = Mat4.orthoDx(l,r,b,t,zn,zf);
      const m = mat4.create();
      mat4.orthoZO(m,l,r,b,t,zn,zf);
      const ex = Mat4.fromArray(m);
      const equal = re.equals(ex)
      expect(equal).toEqual(true)
    }, [
      {name: 'left', arg: left},
      {name: 'right', arg: right},
      {name: 'bottom', arg: bottom},
      {name: 'top', arg: top},
      {name: 'near', arg: near},
      {name: 'far', arg: far}
    ]);
  }
})

describe('Mat4.lookAt', ()=>{
  for(let i = 0; i < 100; i++) {
    const from = Vec3.RAND.mulMutable(100);
    const to = Vec3.RAND.mulMutable(100);
    const up = Vec3.RAND.normalize();
    test((f: Vec3, t: Vec3, u: Vec3)=>{
      const re = Mat4.lookAt(f,t,u);
      const m = mat4.create();
      const from = vec3.create();
      vec3.set(from, f.x, f.y, f.z);
      const to = vec3.create();
      vec3.set(to, t.x, t.y, t.z);
      const up = vec3.create();
      vec3.set(up, u.x, u.y, u.z);
      mat4.lookAt(m,from,to,up);
      const ex = Mat4.fromArray(m);
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

describe('Mat4.transpose', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat4.RAND.mulMutable(100);
    test((m1: Mat4)=>{
      const re = m1.transpose();
      const mt = mat4.fromValues(
        m1.i.x, m1.i.y, m1.i.z, m1.i.w,
        m1.j.x, m1.j.y, m1.j.z, m1.j.w,
        m1.k.x, m1.k.y, m1.k.z, m1.k.w,
        m1.l.x, m1.l.y, m1.l.z, m1.l.w
        );
      const m = mat4.create();
      mat4.transpose(m, mt);
      const ex = Mat4.fromArray(m);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'Mat4', arg: m1}
    ]);
  }
})

describe('Mat4.getQuaternion', ()=>{
  for(let i = 0; i < 100; i++) {
    const q1 = Quaternion.QRAND;
    const m1 = Mat4.fromQuat(q1);
    test((m1: Mat4)=>{
      const re = m1.getQuaternion();
      const mt = mat4.fromValues(
        m1.i.x, m1.i.y, m1.i.z, m1.i.w,
        m1.j.x, m1.j.y, m1.j.z, m1.j.w,
        m1.k.x, m1.k.y, m1.k.z, m1.k.w,
        m1.l.x, m1.l.y, m1.l.z, m1.l.w
        );
      const q = quat.create();
      mat4.getRotation(q, mt);
      const ex = Quaternion.fromArray(q);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'Mat4', arg: m1}
    ]);
  }
})


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
      const ex = Quaternion.fromArray(q);
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
