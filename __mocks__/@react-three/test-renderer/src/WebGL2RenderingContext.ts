/**
 * Minimal WebGL2RenderingContext mock for testing.
 * The original lived in @react-three/test-renderer/src/ in the monorepo.
 * Uses a Proxy to auto-stub any missing WebGL methods and constants.
 */

// Standard WebGL constants (subset needed by Three.js)
const GL_CONSTANTS: Record<string, number> = {
  // Data types
  BYTE: 0x1400, UNSIGNED_BYTE: 0x1401, SHORT: 0x1402, UNSIGNED_SHORT: 0x1403,
  INT: 0x1404, UNSIGNED_INT: 0x1405, FLOAT: 0x1406, HALF_FLOAT: 0x140b,

  // Pixel formats
  DEPTH_COMPONENT: 0x1902, ALPHA: 0x1906, RGB: 0x1907, RGBA: 0x1908,
  LUMINANCE: 0x1909, LUMINANCE_ALPHA: 0x190a, RED: 0x1903, RG: 0x8227,
  RED_INTEGER: 0x8d94, RG_INTEGER: 0x8228, RGB_INTEGER: 0x8d98, RGBA_INTEGER: 0x8d99,

  // Internal formats
  R8: 0x8229, RG8: 0x822b, RGB8: 0x8051, RGBA8: 0x8058,
  R16F: 0x822d, RG16F: 0x822f, RGB16F: 0x881b, RGBA16F: 0x881a,
  R32F: 0x822e, RG32F: 0x8230, RGB32F: 0x8815, RGBA32F: 0x8814,
  DEPTH_COMPONENT16: 0x81a5, DEPTH_COMPONENT24: 0x81a6, DEPTH_COMPONENT32F: 0x8cac,
  DEPTH24_STENCIL8: 0x88f0, DEPTH32F_STENCIL8: 0x8cad, SRGB8_ALPHA8: 0x8c43,

  // Texture
  TEXTURE_2D: 0x0de1, TEXTURE_3D: 0x806f, TEXTURE_CUBE_MAP: 0x8513,
  TEXTURE_2D_ARRAY: 0x8c1a, TEXTURE_CUBE_MAP_POSITIVE_X: 0x8515,
  TEXTURE_MAG_FILTER: 0x2800, TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_WRAP_S: 0x2802, TEXTURE_WRAP_T: 0x2803, TEXTURE_WRAP_R: 0x8072,
  NEAREST: 0x2600, LINEAR: 0x2601,
  NEAREST_MIPMAP_NEAREST: 0x2700, LINEAR_MIPMAP_NEAREST: 0x2701,
  NEAREST_MIPMAP_LINEAR: 0x2702, LINEAR_MIPMAP_LINEAR: 0x2703,
  CLAMP_TO_EDGE: 0x812f, MIRRORED_REPEAT: 0x8370, REPEAT: 0x2901,
  TEXTURE_MAX_ANISOTROPY_EXT: 0x84fe,

  // Framebuffer
  FRAMEBUFFER: 0x8d40, READ_FRAMEBUFFER: 0x8ca8, DRAW_FRAMEBUFFER: 0x8ca9,
  RENDERBUFFER: 0x8d41,
  COLOR_ATTACHMENT0: 0x8ce0, DEPTH_ATTACHMENT: 0x8d00, STENCIL_ATTACHMENT: 0x8d20,
  DEPTH_STENCIL_ATTACHMENT: 0x821a, DEPTH_STENCIL: 0x84f9,
  FRAMEBUFFER_COMPLETE: 0x8cd5,

  // Blend
  ZERO: 0, ONE: 1,
  SRC_COLOR: 0x0300, ONE_MINUS_SRC_COLOR: 0x0301,
  SRC_ALPHA: 0x0302, ONE_MINUS_SRC_ALPHA: 0x0303,
  DST_ALPHA: 0x0304, ONE_MINUS_DST_ALPHA: 0x0305,
  DST_COLOR: 0x0306, ONE_MINUS_DST_COLOR: 0x0307,
  FUNC_ADD: 0x8006, FUNC_SUBTRACT: 0x800a, FUNC_REVERSE_SUBTRACT: 0x800b,
  MIN: 0x8007, MAX: 0x8008,

  // Enable/disable
  BLEND: 0x0be2, DEPTH_TEST: 0x0b71, CULL_FACE: 0x0b44,
  STENCIL_TEST: 0x0b90, SCISSOR_TEST: 0x0c11, POLYGON_OFFSET_FILL: 0x8037,
  SAMPLE_ALPHA_TO_COVERAGE: 0x809e, DITHER: 0x0bd0, RASTERIZER_DISCARD: 0x8c89,

  // Depth / stencil
  NEVER: 0x0200, LESS: 0x0201, EQUAL: 0x0202, LEQUAL: 0x0203,
  GREATER: 0x0204, NOTEQUAL: 0x0205, GEQUAL: 0x0206, ALWAYS: 0x0207,
  KEEP: 0x1e00, REPLACE: 0x1e01, INCR: 0x1e02, DECR: 0x1e03,
  INVERT: 0x150a, INCR_WRAP: 0x8507, DECR_WRAP: 0x8508,

  // Front face / cull
  CW: 0x0900, CCW: 0x0901, FRONT: 0x0404, BACK: 0x0405, FRONT_AND_BACK: 0x0408,

  // Buffer
  ARRAY_BUFFER: 0x8892, ELEMENT_ARRAY_BUFFER: 0x8893, UNIFORM_BUFFER: 0x8a11,
  STATIC_DRAW: 0x88e4, DYNAMIC_DRAW: 0x88e8, STREAM_DRAW: 0x88e0,

  // Shader
  FRAGMENT_SHADER: 0x8b30, VERTEX_SHADER: 0x8b31,
  COMPILE_STATUS: 0x8b81, LINK_STATUS: 0x8b82,
  ACTIVE_UNIFORMS: 0x8b86, ACTIVE_ATTRIBUTES: 0x8b89,

  // Draw
  POINTS: 0x0000, LINES: 0x0001, LINE_STRIP: 0x0003, TRIANGLES: 0x0004,
  TRIANGLE_STRIP: 0x0005, TRIANGLE_FAN: 0x0006,

  // Pixel store
  UNPACK_FLIP_Y_WEBGL: 0x9240, UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
  UNPACK_COLORSPACE_CONVERSION_WEBGL: 0x9243, UNPACK_ALIGNMENT: 0x0cf5,

  // Buffer bits
  COLOR_BUFFER_BIT: 0x4000, DEPTH_BUFFER_BIT: 0x0100, STENCIL_BUFFER_BIT: 0x0400,

  // getParameter targets
  VERSION: 0x1f02, SHADING_LANGUAGE_VERSION: 0x8b8c,
  RENDERER: 0x1f01, VENDOR: 0x1f00,
  MAX_TEXTURE_SIZE: 0x0d33, MAX_CUBE_MAP_TEXTURE_SIZE: 0x851c,
  MAX_RENDERBUFFER_SIZE: 0x84e8, MAX_VIEWPORT_DIMS: 0x0d3a,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872, MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
  MAX_VERTEX_ATTRIBS: 0x8869, MAX_VARYING_VECTORS: 0x8dfc,
  MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb, MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
  MAX_SAMPLES: 0x8d57, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c,

  // Misc
  TEXTURE0: 0x84c0, NONE: 0, NO_ERROR: 0,
  UNSIGNED_SHORT_4_4_4_4: 0x8033, UNSIGNED_SHORT_5_5_5_1: 0x8034,
  UNSIGNED_SHORT_5_6_5: 0x8363, UNSIGNED_INT_24_8: 0x84fa,
  FLOAT_32_UNSIGNED_INT_24_8_REV: 0x8dad,

  // Compressed texture formats
  COMPRESSED_RGB_S3TC_DXT1_EXT: 0x83f0, COMPRESSED_RGBA_S3TC_DXT1_EXT: 0x83f1,
  COMPRESSED_RGBA_S3TC_DXT3_EXT: 0x83f2, COMPRESSED_RGBA_S3TC_DXT5_EXT: 0x83f3,
}

class WebGL2RenderingContextImpl {
  drawingBufferWidth: number
  drawingBufferHeight: number
  drawingBufferColorSpace = 'srgb'
  canvas: any
  endFrameEXP?: () => void

  constructor(canvas: { width: number; height: number }) {
    this.drawingBufferWidth = canvas.width
    this.drawingBufferHeight = canvas.height
    this.canvas = canvas
    // Copy all GL constants onto the instance
    Object.assign(this, GL_CONSTANTS)
  }

  getExtension() {
    return null
  }

  getParameter(pname: number): any {
    switch (pname) {
      case 0x0d33: // MAX_TEXTURE_SIZE
      case 0x84e8: // MAX_RENDERBUFFER_SIZE
      case 0x851c: // MAX_CUBE_MAP_TEXTURE_SIZE
        return 4096
      case 0x0d3a: // MAX_VIEWPORT_DIMS
        return [4096, 4096]
      case 0x8872: // MAX_TEXTURE_IMAGE_UNITS
      case 0x8b4d: // MAX_COMBINED_TEXTURE_IMAGE_UNITS
      case 0x8b4c: // MAX_VERTEX_TEXTURE_IMAGE_UNITS
        return 16
      case 0x8869: // MAX_VERTEX_ATTRIBS
        return 16
      case 0x8dfc: // MAX_VARYING_VECTORS
      case 0x8dfb: // MAX_VERTEX_UNIFORM_VECTORS
      case 0x8dfd: // MAX_FRAGMENT_UNIFORM_VECTORS
        return 256
      case 0x8d57: // MAX_SAMPLES
        return 4
      case 0x1f02: // VERSION
        return 'WebGL 2.0 (Mock)'
      case 0x8b8c: // SHADING_LANGUAGE_VERSION
        return 'WebGL GLSL ES 3.00 (Mock)'
      case 0x1f01: // RENDERER
        return 'Mock WebGL Renderer'
      case 0x1f00: // VENDOR
        return 'Mock'
      default:
        return 0
    }
  }

  getShaderPrecisionFormat() {
    return { rangeMin: 127, rangeMax: 127, precision: 23 }
  }

  checkFramebufferStatus() {
    return 0x8cd5 // FRAMEBUFFER_COMPLETE
  }

  getShaderParameter() {
    return true
  }
  getProgramParameter(_program: any, pname: number) {
    if (pname === 0x8b82) return true // LINK_STATUS
    if (pname === 0x8b81) return true // COMPILE_STATUS
    if (pname === 0x8b86) return 0 // ACTIVE_UNIFORMS
    if (pname === 0x8b89) return 0 // ACTIVE_ATTRIBUTES
    return true
  }
  getShaderInfoLog() {
    return ''
  }
  getProgramInfoLog() {
    return ''
  }
  getAttribLocation() {
    return 0
  }
  getUniformLocation() {
    return {}
  }
  getContextAttributes() {
    return { alpha: true, antialias: true, depth: true, stencil: true }
  }
  isContextLost() {
    return false
  }
  getSupportedExtensions() {
    return []
  }
  getError() {
    return 0
  }

  createTexture() {
    return {}
  }
  createFramebuffer() {
    return {}
  }
  createRenderbuffer() {
    return {}
  }
  createBuffer() {
    return {}
  }
  createProgram() {
    return {}
  }
  createShader() {
    return {}
  }
  createVertexArray() {
    return {}
  }
  createQuery() {
    return {}
  }
  createSampler() {
    return {}
  }
  createTransformFeedback() {
    return {}
  }
  fenceSync() {
    return {}
  }
}

// Use Proxy to auto-stub any uncovered WebGL methods as no-ops
export const WebGL2RenderingContext = new Proxy(WebGL2RenderingContextImpl, {
  construct(Target, args) {
    const instance = new Target(args[0])
    return new Proxy(instance, {
      get(target: any, prop: string | symbol) {
        if (typeof prop === 'symbol') return target[prop]
        if (prop in target) return target[prop]
        // Return no-op for any missing method
        return () => {}
      },
    })
  },
})
