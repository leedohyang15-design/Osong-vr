// Shows: a timeline of steps the camera, clock and highlights follow.
// Every phone evaluates the same timeline from the same show position, so only the position needs syncing.
//
// step fields
//   t        start time in seconds from the beginning of the show
//   move     seconds spent gliding from the previous view to this one
//   minutes  sky clock, minutes after 18:00 KST (glides with the camera)
//   target   what to look at: {cons:'Peg'} | {star:'북극성'} | {dso:'안드로메다은하'} | {body:'Saturn'} | {altaz:[alt, az]}
//   fov      field of view in degrees for the on-screen view (VR keeps the headset's own)
//   highlight  constellation id to light up, figures  constellation ids whose drawings appear
//   pointer  [from, to] star names joined by a dotted guide line
//   title, sub  caption on everyone's screen       note  script for the presenter (host screen only)
var SHOWS = [
  {
    id: 'autumn',
    title: '가을 밤하늘 투어',
    blurb: '노을 진 서쪽 하늘에서 시작해 대사각형, 안드로메다, 북극성, 좀생이별을 지나 토성까지.',
    duration: 316,
    steps: [
      { t: 0, move: 0, minutes: 25, target: { altaz: [12, 252] }, fov: 96,
        title: '해가 진 뒤, 서쪽 하늘', sub: '오후 6시 25분',
        note: '오늘 해는 오후 5시 35분쯤 졌어요. 해가 지고도 한 시간 가까이는 하늘이 완전히 어두워지지 않아요. 지금은 아주 밝은 별 몇 개만 보이죠. 서쪽 아래에 남아 있는 노을빛을 함께 보세요.' },
      { t: 22, move: 14, minutes: 90, target: { altaz: [62, 268] }, fov: 100,
        highlight: 'Cyg', figures: ['Cyg', 'Lyr', 'Aql'],
        title: '여름의 대삼각형', sub: '직녀성 · 견우성 · 데네브',
        note: '시간을 한 시간쯤 앞으로 돌렸어요. 저녁 7시 반, 하늘이 깜깜해졌어요. 서쪽 높은 곳에 밝은 별 세 개가 큰 삼각형을 만들어요. 가장 밝은 별이 직녀성, 아래쪽이 견우성이에요. 둘 사이로 은하수가 흘러요. 여름 별자리들이 이제 서쪽으로 물러나고 있어요.' },
      { t: 56, move: 6, minutes: 90, target: { cons: 'Peg' }, fov: 84,
        highlight: 'Peg', figures: ['Peg'],
        title: '가을의 대사각형', sub: '페가수스자리',
        note: '이제 고개를 남동쪽 높이 돌려 볼게요. 밝은 별 네 개가 커다란 네모를 만들죠. 가을의 대사각형이에요. 날개 달린 말 페가수스의 몸통이고, 말은 거꾸로 뒤집혀 있어요. 네모 안에 별이 몇 개 보이는지 세어 보세요. 많이 보일수록 하늘이 어두운 거예요.' },
      { t: 88, move: 5, minutes: 90, target: { cons: 'And' }, fov: 84,
        highlight: 'And', figures: ['And'],
        title: '안드로메다 공주', sub: '그리고 250만 광년 떨어진 이웃 은하',
        note: '대사각형 왼쪽 위 꼭짓점에서 왼쪽으로 별들이 이어져요. 사슬에 묶인 공주 안드로메다예요. 허리께 별에서 위로 두 칸 올라가면 희뿌연 얼룩, 안드로메다은하가 있어요. 우리가 지금 보는 빛은 250만 년 전에 출발한 빛이에요.' },
      { t: 120, move: 5, minutes: 90, target: { cons: 'Cas' }, fov: 84,
        highlight: 'Cas', figures: ['Cas'],
        title: '카시오페이아', sub: '의자에 앉은 왕비, W 모양',
        note: '북동쪽 높은 곳의 W 모양이 안드로메다의 엄마, 카시오페이아 왕비예요. 딸이 너무 예쁘다고 자랑하다 벌을 받아 의자에 묶인 채 하늘을 돌게 됐대요. 그래서 밤이 깊어지면 거꾸로 매달리게 돼요.' },
      { t: 150, move: 5, minutes: 90, target: { star: '북극성' }, fov: 92,
        highlight: 'UMi', figures: ['UMi'], pointer: ['나비', '북극성'],
        title: '북극성 찾기', sub: 'W의 가운데에서 북쪽으로',
        note: 'W의 가운데 별에서 점선을 따라 쭉 내려가면 혼자 반짝이는 별이 있어요. 북극성이에요. 거의 움직이지 않아서 옛날 사람들은 이 별로 북쪽을 찾았어요. 오송에서는 지평선에서 약 37도, 주먹 네 개쯤 높이에 있어요.' },
      { t: 182, move: 5, minutes: 90, target: { cons: 'Per' }, fov: 84,
        highlight: 'Per', figures: ['Per'],
        title: '영웅 페르세우스', sub: '메두사의 머리, 알골',
        note: '카시오페이아 아래쪽이 영웅 페르세우스예요. 메두사를 물리치고 바다 괴물에게서 안드로메다를 구했어요. 손에 든 메두사 머리 자리에 있는 별 알골은 사흘마다 어두워졌다 밝아져요.' },
      { t: 212, move: 10, minutes: 150, target: { dso: '좀생이별 (플레이아데스)' }, fov: 72,
        highlight: 'Tau', figures: ['Tau'],
        title: '좀생이별', sub: '밤 8시 반, 동쪽에서 떠오르는 황소자리',
        note: '시간을 다시 한 시간 앞으로 돌렸어요. 동쪽에서 작은 별들이 옹기종기 모인 무리가 올라와요. 우리말로 좀생이별, 플레이아데스예요. 그 아래 붉은 별 알데바란이 황소의 눈이에요. 겨울이 다가오면 이 별들이 저녁 하늘의 주인공이 돼요.' },
      { t: 242, move: 6, minutes: 150, target: { body: 'Saturn' }, fov: 58,
        title: '토성', sub: '오늘 밤 망원경으로 볼 행성',
        note: '남동쪽에 노란빛으로 흔들림 없이 빛나는 게 토성이에요. 별처럼 반짝이지 않고 차분하게 빛나는 게 행성의 특징이에요. 올해는 고리가 거의 옆면을 보이고 있어서 망원경으로 보면 아주 가는 선처럼 보여요. 잠시 뒤 망원경으로 직접 확인해 볼게요.' },
      { t: 268, move: 6, minutes: 150, target: { star: '포말하우트' }, fov: 84,
        highlight: 'PsA', figures: ['PsA'],
        title: '포말하우트', sub: '가을 하늘의 하나뿐인 1등성',
        note: '남쪽 낮은 곳에 혼자 밝은 별이 있어요. 남쪽물고기자리의 포말하우트예요. 가을 하늘에서 유일한 1등성이라 주변이 더 쓸쓸해 보여요.' },
      { t: 292, move: 9, minutes: 150, target: { altaz: [82, 180] }, fov: 112,
        title: '이제 진짜 하늘을 볼 시간', sub: '헤드셋을 벗고, 눈이 어둠에 익을 때까지 2분만 기다려 보세요',
        note: '오늘 본 별자리들이 지금 우리 머리 위에 그대로 있어요. 헤드셋을 벗고 진짜 하늘을 올려다봐 주세요. 눈이 어둠에 익으려면 시간이 걸리니, 휴대폰 화면은 잠깐 꺼 두세요.' }
    ]
  }
];

var ShowTimeline = (function () {
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function byId(id) { for (var i = 0; i < SHOWS.length; i++) if (SHOWS[i].id === id) return SHOWS[i]; return null; }
  function stepAt(show, t) {
    var i = 0;
    while (i + 1 < show.steps.length && show.steps[i + 1].t <= t) i++;
    return i;
  }
  // target direction in local East/North/Up at the given sky clock
  function targetEnu(eng, target, minutes) {
    if (target.altaz) return eng.enuFromAltAz(target.altaz[0], target.altaz[1]);
    var v = target.body ? eng.bodyVec(target.body, minutes) : eng.vecOf(target);
    if (!v) return eng.enuFromAltAz(45, 180);
    return SkyCore.apply(SkyCore.eqjToEnu(window.SKY, minutes), v);
  }
  function slerp(a, b, k) {
    var d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), th = Math.acos(d);
    if (th < 1e-4) return b.slice();
    var s = Math.sin(th), wa = Math.sin((1 - k) * th) / s, wb = Math.sin(k * th) / s;
    return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
  }
  // everything a client needs to draw the show at position t (seconds)
  function evaluate(eng, show, t) {
    var i = stepAt(show, t), s = show.steps[i], p = show.steps[Math.max(0, i - 1)];
    var k = s.move > 0 ? ease((t - s.t) / s.move) : 1;
    var minutes = p.minutes + (s.minutes - p.minutes) * k;
    var dir = slerp(targetEnu(eng, p.target, minutes), targetEnu(eng, s.target, minutes), k);
    var fov = (p.fov || 80) + ((s.fov || 80) - (p.fov || 80)) * k;
    var next = show.steps[i + 1], end = next ? next.t : show.duration;
    var capA = Math.min(ease((t - s.t - s.move * 0.5) / 0.8), ease((end - t) / 0.6));
    var figures = {};
    (s.figures || []).forEach(function (id) {
      figures[id] = { p: ease((t - s.t - s.move * 0.7) / 3.2), a: 1 };
    });
    if (i > 0) (p.figures || []).forEach(function (id) {
      if (!figures[id]) figures[id] = { p: 1, a: 1 - ease((t - s.t) / 1.2) };
    });
    var pointer = null;
    if (s.pointer) pointer = { from: eng.vecOf({ star: s.pointer[0] }), to: eng.vecOf({ star: s.pointer[1] }), p: ease((t - s.t - s.move) / 2) };
    return {
      index: i, step: s, k: k, minutes: minutes, dir: dir, fov: fov,
      highlight: s.highlight || null, hlAlpha: ease((t - s.t - s.move * 0.4) / 1), figures: figures, pointer: pointer,
      caption: s.title ? { title: s.title, sub: s.sub || '', alpha: Math.max(0, capA) } : null,
      ended: t >= show.duration, endTargetEnu: targetEnu(eng, s.target, s.minutes)
    };
  }
  return { byId: byId, stepAt: stepAt, evaluate: evaluate };
})();
if (typeof module !== 'undefined') module.exports = { SHOWS: SHOWS, ShowTimeline: ShowTimeline };
