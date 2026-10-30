// WebGL background: sky colour plus the NASA Milky Way photo map, drawn behind the 2D sky canvas.
// Each screen pixel is turned back into a direction on the sky (undoing the VR lens correction first)
// and looked up in the equirectangular map (equatorial J2000, 0h at the centre, RA increasing to the left).
var SkyGL = function (canvas, url) {
  'use strict';
  var gl = null;
  try { gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false }); } catch (e) {}
  if (!gl) return null;

  var VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FS = [
    'precision highp float;',
    'uniform sampler2D tex; uniform float ready;',
    'uniform vec2 size; uniform float dpr;',
    'uniform vec2 c; uniform float f; uniform float R; uniform float k;',
    'uniform mat3 T; uniform vec3 up;',
    'uniform vec3 sky; uniform float gain;',
    'void main(){',
    '  vec2 px = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y) / dpr;',
    '  vec2 d = px - c;',
    '  if (k > 0.0) { float q = 1.0 - k * dot(d, d) / (R * R); if (q <= 0.02) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; } d /= sqrt(q); }',
    '  vec3 cam = normalize(vec3(d.x / f, -d.y / f, 1.0));',
    '  vec3 v = T * cam;', // the uniform holds the transpose of J2000 -> camera, which takes the ray back to J2000
    '  float alt = dot(up, v);',
    '  vec3 col = sky;',
    '  if (ready > 0.5 && gain > 0.0 && alt > 0.0) {',
    '    float ra = atan(v.y, v.x), dec = asin(clamp(v.z, -1.0, 1.0));',
    '    vec2 uv = vec2(0.5 - ra / 6.2831853, 0.5 - dec / 3.1415927);',
    '    vec3 mw = texture2D(tex, uv).rgb;',
    '    float ext = smoothstep(0.0, 0.42, alt);', // thicker air near the horizon hides the faint band
    '    col += mw * mw * gain * ext + mw * gain * 0.35 * ext;',
    '  }',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function shader(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('SkyGL disabled:', e); return null; }
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['tex', 'ready', 'size', 'dpr', 'c', 'f', 'R', 'k', 'T', 'up', 'sky', 'gain'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  var ready = false;
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]));
  var img = new Image();
  img.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    // no mipmaps: they would draw a seam where RA wraps from 360 to 0
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    ready = true;
  };
  img.src = url;

  var W = 0, H = 0, DPR = 1;
  return {
    resize: function (w, h, dpr) {
      W = w; H = h; DPR = dpr;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    },
    // views: [{cx, cy, f, R, k, clip:[x,y,w,h]}]; T: J2000 -> camera rows; up: J2000 -> local Up row; sky: rgb 0..1
    draw: function (views, T, up, sky, gain) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1i(U.tex, 0); gl.uniform1f(U.ready, ready ? 1 : 0);
      gl.uniform2f(U.size, canvas.width, canvas.height); gl.uniform1f(U.dpr, DPR);
      // GLSL mat3 is column-major: uploading T's rows as columns gives the transpose (camera -> J2000)
      gl.uniformMatrix3fv(U.T, false, new Float32Array([T[0][0], T[0][1], T[0][2], T[1][0], T[1][1], T[1][2], T[2][0], T[2][1], T[2][2]]));
      gl.uniform3f(U.up, up[0], up[1], up[2]);
      gl.uniform3f(U.sky, sky[0], sky[1], sky[2]);
      gl.uniform1f(U.gain, gain);
      gl.enable(gl.SCISSOR_TEST);
      for (var i = 0; i < views.length; i++) {
        var v = views[i], cl = v.clip;
        gl.scissor(Math.round(cl[0] * DPR), Math.round((H - cl[1] - cl[3]) * DPR), Math.round(cl[2] * DPR), Math.round(cl[3] * DPR));
        gl.uniform2f(U.c, v.cx, v.cy); gl.uniform1f(U.f, v.f); gl.uniform1f(U.R, v.R); gl.uniform1f(U.k, v.k);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.disable(gl.SCISSOR_TEST);
    }
  };
};
