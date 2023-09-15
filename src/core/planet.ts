import { rad } from "./mathutils";
import { Quaternion } from "./quaternion";
import { Vec3 } from "./vectors";

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
  orientation: Quaternion;

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

}