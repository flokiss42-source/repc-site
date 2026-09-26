(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.remove('no-js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.motion-toggle');
  let motionOff = reduced.matches || navigator.connection?.saveData === true;
  let pending = 0, progress = 0, phase = 0;
  const track = document.querySelector('.journey-track');
  const stage = document.querySelector('.journey-stage');
  const chapters = [...document.querySelectorAll('.journey-chapter')];
  const rail = [...document.querySelectorAll('[data-jump]')];
  const hero = document.querySelector('.opening');
  const heroArt = document.querySelector('.opening-art');
  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
  const ease = n => n * n * (3 - 2 * n);
  let renderer = null;
  function paintScroll() {
    pending = 0;
    if (track && !motionOff) {
      const header = document.querySelector('.site-header').getBoundingClientRect().height;
      const distance = Math.max(1, track.offsetHeight - (innerHeight - header));
      progress = clamp((header - track.getBoundingClientRect().top) / distance);
      phase = Math.min(2, Math.round(progress * 2));
      track.dataset.phase = String(phase); track.dataset.progress = progress.toFixed(3);
      const emergence = ease(clamp((progress - .04) / .50));
      stage.style.setProperty('--transfer', String(clamp(emergence * 1.7)));
      stage.style.setProperty('--reveal', `${emergence * 135}%`);
      stage.style.setProperty('--transfer-scale', String(1.08 - emergence * .08));
      stage.style.setProperty('--pass-scale', String(1 - ease(clamp(progress * 2)) * .80));
      stage.style.setProperty('--pass-x', `${ease(clamp(progress * 2)) * 28}%`);
      stage.style.setProperty('--pass-rotate', `${-12 + progress * 64}deg`);
      stage.style.setProperty('--pass-opacity', String(1 - ease(clamp((progress - .30) / .28))));
      chapters.forEach((chapter, i) => {
        const alpha = clamp(1 - Math.abs(progress * 2 - i) * 1.6);
        chapter.style.opacity = alpha;
        chapter.style.setProperty('--chapter-offset', `${(i - progress * 2) * 48}px`);
        chapter.style.visibility = alpha > .01 ? 'visible' : 'hidden';
        chapter.classList.toggle('is-active', i === phase);
        chapter.inert = i !== phase;
        chapter.setAttribute('aria-hidden', String(i !== phase));
      });
      rail.forEach((link, i) => {
        link.querySelector('i').style.width = `${clamp(progress * 3 - i) * 100}%`;
        if (i === phase) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current');
      });
    }
    if (heroArt && hero && !motionOff) {
      const amount = clamp(-hero.getBoundingClientRect().top / hero.offsetHeight);
      heroArt.style.transform = `translateY(${-amount * 75}px) rotate(${amount * 8}deg)`;
    }
    renderer?.render();
  }
  function queueScroll() { if (!pending) pending = requestAnimationFrame(paintScroll); }
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', queueScroll, { passive: true });
  function setMotion() {
    root.classList.toggle('motion-off', motionOff);
    root.classList.toggle('js-motion', !motionOff);
    if (toggle) { toggle.textContent = motionOff ? 'Включить эффекты' : 'Пауза эффектов'; toggle.setAttribute('aria-pressed', String(motionOff)); }
    if (motionOff) {
      chapters.forEach(chapter => { chapter.removeAttribute('aria-hidden'); chapter.inert = false; });
      if (heroArt) heroArt.style.transform = '';
    }
    paintScroll(); renderer?.sync();
  }
  toggle?.addEventListener('click', () => { motionOff = !motionOff; setMotion(); });
  reduced.addEventListener('change', () => { motionOff = reduced.matches; setMotion(); });
  rail.forEach(link => link.addEventListener('click', e => {
    if (!track || motionOff) return;
    e.preventDefault();
    const header = document.querySelector('.site-header').getBoundingClientRect().height;
    const start = scrollY + track.getBoundingClientRect().top - header;
    const distance = track.offsetHeight - (innerHeight - header);
    scrollTo({ top: start + Number(link.dataset.jump) / 2 * distance, behavior: 'smooth' });
  }));
  const reveals = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveals.unobserve(entry.target); } }), { threshold: .07 });
  document.querySelectorAll('[data-reveal]').forEach(el => reveals.observe(el));
  setMotion();

  // Refract the generated old-to-new computer transfer scene directly.
  function createMirage() {
    const canvas = document.querySelector('.mirage-canvas');
    if (!canvas) return null;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return null;
    const vertex = 'attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
    const fragment = `precision mediump float;
      varying vec2 uv; uniform sampler2D picture; uniform vec2 screenSize; uniform vec2 imageSize; uniform float time; uniform float progress;
      void main(){
        vec2 q=vec2(uv.x,1.-uv.y);float screenAspect=screenSize.x/screenSize.y;float imageAspect=imageSize.x/imageSize.y;
        if(screenAspect<imageAspect){q.x=(q.x-.5)*screenAspect/imageAspect+(screenAspect<1.? .67:.5);}else{q.y=(q.y-.5)*imageAspect/screenAspect+.5;}
        float transition=pow(sin(progress*3.14159265),2.);
        float mist=sin(q.y*13.+time*.45+sin(q.x*9.-time*.3))*sin(q.x*10.+q.y*5.+time*.22);
        float lens=exp(-length((q-vec2(.7,.48))*vec2(1.2,1.))*2.4);
        vec2 bend=vec2(mist,sin(q.x*17.+time*.35+q.y*4.))*lens*(.001+transition*.009);
        vec2 warped=clamp(q+bend,vec2(.001),vec2(.999));
        float split=transition*.0008*lens;
        vec3 color=vec3(texture2D(picture,clamp(warped+vec2(split,0.),0.,1.)).r,texture2D(picture,warped).g,texture2D(picture,clamp(warped-vec2(split,0.),0.,1.)).b);
        gl_FragColor=vec4(color,1.);
      }`;
    let program; const shaders = [];
    try {
      for (const [kind, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
        const shader = gl.createShader(kind); shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Unsupported mirage shader');
      }
      program = gl.createProgram(); shaders.forEach(shader => gl.attachShader(program, shader)); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Unsupported mirage program');
    } catch { shaders.forEach(shader => gl.deleteShader(shader)); if (program) gl.deleteProgram(program); return null; }
    shaders.forEach(shader => gl.deleteShader(shader)); gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const uniforms = Object.fromEntries(['picture','screenSize','imageSize','time','progress'].map(name => [name,gl.getUniformLocation(program,name)]));
    let ready = false, visible = false, lost = false, frame = 0, last = 0, elapsed = 0;
    let imageWidth = 1, imageHeight = 1;
    function render() {
      if (!ready || lost || motionOff) return;
      gl.uniform2f(uniforms.screenSize,canvas.width,canvas.height);gl.uniform2f(uniforms.imageSize,imageWidth,imageHeight);gl.uniform1f(uniforms.time,elapsed);gl.uniform1f(uniforms.progress,progress);gl.drawArrays(gl.TRIANGLES,0,6);
    }
    function tick(now) {
      frame=0;if(!ready||lost||!visible||document.hidden||motionOff)return;
      if(now-last>=40){elapsed+=Math.min((now-last)/1000,.08);last=now;render();}
      frame=requestAnimationFrame(tick);
    }
    function sync() {cancelAnimationFrame(frame);frame=0;last=performance.now();if(ready&&!lost&&visible&&!document.hidden&&!motionOff)frame=requestAnimationFrame(tick);}
    const picture = new Image();
    picture.onload = () => {
      try {
        imageWidth=picture.naturalWidth;imageHeight=picture.naturalHeight;
        const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,picture);gl.uniform1i(uniforms.picture,0);ready=true;resize();render();canvas.classList.add('is-ready');sync();
      } catch { canvas.classList.remove('is-ready'); }
    };
    picture.src = new URL('assets/migration-transfer-scene.webp',document.baseURI).href;
    function resize(){const box=canvas.getBoundingClientRect();const scale=Math.min(1.25,devicePixelRatio||1,1100/Math.max(1,box.width),900/Math.max(1,box.height));canvas.width=Math.max(1,Math.round(box.width*scale));canvas.height=Math.max(1,Math.round(box.height*scale));gl.viewport(0,0,canvas.width,canvas.height);render();}
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(stage);
    document.addEventListener('visibilitychange',sync);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);canvas.classList.remove('is-ready');});
    return {render,sync};
  }
  renderer = createMirage();

  const sections = [...document.querySelectorAll('.article-body h2[id]')];
  if (sections.length) {
    const navLinks = [...document.querySelectorAll('.article-toc a')];
    // Observe each heading independently without intercepting browser navigation.
    const observer=new IntersectionObserver(entries=>{entries.filter(e=>e.isIntersecting).forEach(e=>navLinks.forEach(a=>{if(a.hash==='#'+e.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}));},{rootMargin:'-10% 0px -70% 0px'});
    sections.forEach(section=>observer.observe(section));
  }
})();
