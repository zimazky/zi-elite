import Rand from 'src/shared/libs/Rand'

export default class NoiseImg {

  static createBWNoiseImage(width: number, height: number, seed: string): HTMLImageElement {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if(!context) {
      const s = 'Не удалось создать 2d контекст для canvas'
      alert(s)
      throw new Error(s)
    }
    const imgData = context.createImageData(width, height)
    canvas.width = width
    canvas.height = height
    const r = new Rand(seed)
    for(var i = 0; i < width*height; i++) {
      const n = Math.floor(r.rand()*256)
      imgData.data[4*i] = n
      imgData.data[4*i + 1] = n
      imgData.data[4*i + 2] = n
      imgData.data[4*i + 3] = 255
    }
    context.putImageData(imgData, 0, 0)
    const image = new Image()
    image.src = canvas.toDataURL('image/png')
    return image
  }

  createFloat32ArrayR(width: number, height: number, seed: string): Float32Array {
    const len = width*height
    const d = new Float32Array(len)
    const r = new Rand(seed)
    for(var i = 0; i < len; i++) d[i] = r.rand()
    return d
  }

}