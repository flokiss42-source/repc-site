(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const bar = document.createElement('div');
  bar.className = 'reading-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.append(bar);
  const story = document.querySelector('.continuity');
  const steps = [...document.querySelectorAll('.story-step')];
  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    const range = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${range > 0 ? Math.min(1, scrollY / range) : 0})`;
    if (story) {
      let phase = 0;
      steps.forEach((step, i) => { if (step.getBoundingClientRect().top < innerHeight * .58) phase = i; });
      story.dataset.phase = String(phase);
    }
  }
  addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }, { passive: true });
  addEventListener('resize', updateScroll, { passive: true }); updateScroll();

  const host = document.querySelector('.hero-scene');
  if (!host) return;
  const canvas = host.querySelector('canvas');
  const toggle = document.querySelector('.motion-toggle');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) { if (toggle) toggle.hidden = true; return; }
  // A signed-distance 3D solid, lit in world space. All geometry is generated locally.
  const vertex = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  const fragment = `precision mediump float;
    uniform vec2 resolution; uniform float time; uniform vec2 pointer; uniform float travel;
    mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
    float box(vec3 p,vec3 b,float r){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
    float shape(vec3 p){
      p.xz=rot(-.44+sin(time*.24)*.12+pointer.x*.13+travel*.5)*p.xz;
      p.yz=rot(.22+pointer.y*.09)*p.yz; p.xy=rot(-.12+sin(time*.18)*.06)*p.xy;
      float d=box(p,vec3(.72,1.02,.15),.14);
      d=min(d,box(p-vec3(-.13,.09,-.32),vec3(.72,1.02,.07),.14));
      d=min(d,box(p-vec3(-.26,.18,-.54),vec3(.72,1.02,.05),.14));
      return d;
    }
    vec3 normal(vec3 p){vec2 e=vec2(.003,0.);return normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));}
    void main(){
      vec2 uv=(gl_FragCoord.xy*2.-resolution)/resolution.y;
      vec3 bg=vec3(.063,.086,.071);
      float haze=sin(uv.x*3.+sin(uv.y*3.+time*.28))*sin(uv.y*2.-time*.18);
      bg+=vec3(.15,.21,.06)*exp(-length(uv-vec2(.1,0.)) * 1.5)*(.16+.12*haze);
      vec3 ro=vec3(0.,0.,5.4),rd=normalize(vec3(uv,-2.55));
      float t=0.;vec3 p=ro;
      for(int i=0;i<64;i++){p=ro+rd*t;float d=shape(p);if(d<.003||t>8.)break;t+=d*.85;}
      vec3 col=bg;
      if(t<8.){
        vec3 n=normal(p),l=normalize(vec3(-2.,3.,4.)),v=-rd;
        float diff=max(dot(n,l),0.);float fres=pow(1.-max(dot(n,v),0.),3.);
        float spec=pow(max(dot(n,normalize(l+v)),0.),55.);
        float sweep=pow(.5+.5*sin(p.x*2.+p.y*1.4+time*.3),5.);
        vec3 metal=mix(vec3(.20,.29,.16),vec3(.65,.79,.44),smoothstep(-1.,1.2,p.y));
        col=metal*(.3+.7*diff)+vec3(.84,1.,.64)*spec*.8+vec3(.60,.83,.36)*fres*.7+sweep*.07;
        float line=1.-smoothstep(.012,.022,abs(p.y+.62));
        col+=line*.12*max(n.z,0.);
      }
      col+=.006*sin(gl_FragCoord.x*1.9+gl_FragCoord.y*2.1);
      gl_FragColor=vec4(col,1.);
    }`;
  const shaders = [];
  let program;
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type); shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Scene shader unavailable');
    }
    program = gl.createProgram(); shaders.forEach(shader => gl.attachShader(program, shader)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Scene unavailable');
  } catch {
    shaders.forEach(shader => gl.deleteShader(shader)); if (program) gl.deleteProgram(program);
    if (toggle) toggle.hidden = true; return;
  }
  shaders.forEach(shader => gl.deleteShader(shader));
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['resolution', 'time', 'pointer', 'travel'].map(name => [name, gl.getUniformLocation(program, name)]));
  let paused = reduced.matches || navigator.connection?.saveData === true;
  let visible = true, frame = 0, last = 0, elapsed = 0, lost = false;
  const pointer = { x: 0, y: 0 };
  function size() {
    const scale = Math.min(devicePixelRatio || 1, 1.25, 1000 / Math.max(1, host.clientWidth));
    canvas.width = Math.max(1, Math.round(host.clientWidth * scale)); canvas.height = Math.max(1, Math.round(host.clientHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height); render();
  }
  function render() {
    if (lost) return;
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height); gl.uniform1f(uniforms.time, elapsed);
    gl.uniform2f(uniforms.pointer, paused ? 0 : pointer.x, paused ? 0 : pointer.y);
    gl.uniform1f(uniforms.travel, paused ? 0 : Math.min(scrollY / Math.max(1, innerHeight), 1));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function tick(now) {
    frame = 0;
    if (paused || !visible || document.hidden || lost) return;
    if (now - last >= 32) { elapsed += Math.min((now - last) / 1000, .05); last = now; render(); }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = performance.now();
    if (!paused && visible && !document.hidden && !lost) frame = requestAnimationFrame(tick);
    if (toggle) { toggle.textContent = paused ? 'Включить анимацию' : 'Пауза анимации'; toggle.setAttribute('aria-pressed', String(paused)); }
    render();
  }
  toggle?.addEventListener('click', () => { paused = !paused; sync(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  document.querySelector('.hero').addEventListener('pointermove', e => { pointer.x = e.clientX / innerWidth - .5; pointer.y = e.clientY / innerHeight - .5; }, { passive: true });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { rootMargin: '50px' }).observe(host);
  new ResizeObserver(size).observe(host);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; cancelAnimationFrame(frame); host.classList.remove('is-ready'); if (toggle) toggle.hidden = true; });
  size(); host.classList.add('is-ready'); sync();
})();
