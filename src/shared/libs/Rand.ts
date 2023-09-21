export default class Rand {

  rand: () => number

  constructor(str: string) {
    const seed = xmur3a(str)
    this.rand = sfc32(seed(), seed(), seed(), seed())
  }
}

/** 
 * Функция инициализации генератора хэш-функции MurmurHash3
 * Генератор используется для генерации начальных значений (seeds) генераторов псевдослучайных чисел
 * @param str - строка для инициализации хэш-функции
 * @returns - функция генератор 
 */
function xmur3(str: string) {
  for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
      h = h << 13 | h >>> 19;
  return function() {
      h = Math.imul(h ^ h >>> 16, 2246822507),
      h = Math.imul(h ^ h >>> 13, 3266489909);
      return (h ^= h >>> 16) >>> 0;
  }
}

/** 
 * Функция инициализации генератора хэш-функции MurmurHash3 (вторая версия)
 * Генератор используется для генерации начальных значений (seeds) генераторов псевдослучайных чисел
 * @param str - строка для инициализации хэш-функции
 * @returns - функция генератор 
 */
function xmur3a(str: string) {
  for(var k, i = 0, h = 2166136261 >>> 0; i < str.length; i++) {
      k = Math.imul(str.charCodeAt(i), 3432918353); k = k << 15 | k >>> 17;
      h ^= Math.imul(k, 461845907); h = h << 13 | h >>> 19;
      h = Math.imul(h, 5) + 3864292196 | 0;
  }
  h ^= str.length;
  return function() {
      h ^= h >>> 16; h = Math.imul(h, 2246822507);
      h ^= h >>> 13; h = Math.imul(h, 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
  }
}

/** Инициализатор генератора псевдослучайных чисел */
function sfc32(a: number, b: number, c: number, d: number) {
  return function() {
    a |= 0; b |= 0; c |= 0; d |= 0; 
    var t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = c << 21 | c >>> 11;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

/** Инициализатор генератора псевдослучайных чисел */
function jsf32b(a: number, b: number, c: number, d: number) {
  return function() {
      a |= 0; b |= 0; c |= 0; d |= 0;
      var t = a - (b << 23 | b >>> 9) | 0;
      a = b ^ (c << 16 | c >>> 16) | 0;
      b = c + (d << 11 | d >>> 21) | 0;
      b = c + d | 0;
      c = d + t | 0;
      d = a + t | 0;
      return (d >>> 0) / 4294967296;
  }
}