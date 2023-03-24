import { rad } from "./mathutils";
import { Quaternion } from "./quaternion";
import { Vec3 } from "./vectors";

/** Класс планеты */
export class Planet {
  /** положение центра планеты
   *  считаем плоскость орбиты лежит в плоскости XY
   *  ось Z направлена на север, ось X - на восток 
   *  оси вращения */
  position: Vec3;
  /** угол наклона экватора к плоскости орбиты (наклон оси вращения) */
  obliquity: number =  rad(23.44);
  /** ось вращения планеты, лежит в плоскости YZ, наклонена в сторону отрицательных значений Y */
  axis: Vec3 = new Vec3(0., -Math.sin(this.obliquity), Math.cos(this.obliquity));
  /** радиус планеты */
  radius: number = 6371e3;
  orientation: Quaternion 

}