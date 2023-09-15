import { rad, smoothstep } from "src/shared/libs/mathutils";
import { Quaternion, Vec3 } from "src/shared/libs/vectors";

import { SUN_DISC_ANGLE_SIN } from "./constants";

/** Класс планеты */
export class Planet {
  /** 
   * положение центра планеты в начальный момент времени
   * в системе координат, связанной с солнцем
   * плоскость орбиты планеты лежит в плоскости XY, солнце в точке (0,0,0)
   * ось Z направлена на в сторону севера,
   * ось Y совпадает с большой полуосью орбиты, положительное направление - зима
   * ось X совпадает с малой полуосью орбиты, положительное направление - весна
   * */

  position: Vec3 = new Vec3(0., 147098291000., 0.);
  /** угол наклона экватора к плоскости орбиты (наклон оси вращения) */
  obliquity: number =  rad(23.44);
  /** 
   * ось вращения планеты в начальный момент времени,
   * лежит в плоскости YZ, наклонена в сторону положительных значений Y 
   * */
  axis: Vec3;
  /** 
   * направление на точку lat: 0, long: 0 в начальный момент времени 
   * лежит в плоскости YZ, наклонена в сторону положительных значений Y (ночь)
   * */
  origin: Vec3;
  /** радиус планеты */
  radius: number = 200000; // 6371e3;
  /** Положение центра планеты относительно системы координат камеры */
  center: Vec3 = new Vec3(0., -this.radius, 0.);
  /** кватернион, определяющий текущую ориентацию планеты при суточном вращении */
  orientation: Quaternion = Quaternion.Identity();

  constructor() {
    this.axis = new Vec3(0., Math.sin(this.obliquity), Math.cos(this.obliquity));
    this.origin = new Vec3(0., Math.cos(this.obliquity), -Math.sin(this.obliquity));
  }

  update(time: number, timeDelta: number): void {


  }

  // Перевод декартовых координат точки в сферические координаты относительно центра планеты
  // Начало декартовых координат совпадает с точкой 0,0,0 на сфере
  // Ось x 
  // Возвращается:
  // x - долгота
  // y - широта
  // z - высота над поверхностью сферы
  lonLatAlt(p: Vec3): Vec3 {
    const r = p.sub(this.center);
    const phi = Math.atan2(r.y, r.x);
    const theta = Math.atan2(Math.sqrt(r.x*r.x + r.y*r.y), r.z);
    const alt = r.length() - this.radius;
    return new Vec3(phi, theta, alt);
  }

  /** 
   * Функция определения пересечения луча с планетой
   *   ro - положение камеры
   *   rd - направление луча
   * Возвращает true если луч пересекается с планетой
   */
  softPlanetShadow(ro: Vec3, rd: Vec3): number {
    const pos = ro.sub(this.center);
    //const pos = new Vec3(0, ro.y+this.planetRadius, 0);
    const OT = pos.dot(rd); // расстояния вдоль луча до точки минимального расстояния до центра планеты
    const CT = Math.sqrt(pos.dot(pos) - OT*OT); // минимальное расстоянии от луча до центра планеты
    if(OT>0.) return 1.;
    const d = (this.radius-CT)/OT;
    return smoothstep(-SUN_DISC_ANGLE_SIN, SUN_DISC_ANGLE_SIN, d);
  }

}