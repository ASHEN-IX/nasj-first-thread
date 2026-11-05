/* global window, document, performance, MediaQueryList, getComputedStyle, innerWidth, setTimeout */
async page => {
  const base='http://127.0.0.1:3100';
  const assert=(test,message)=>{if(!test)throw new Error(message);};
  await page.unrouteAll();
  await page.addInitScript(()=>{
    window.__qaMediaActive=0;
    const registered=new WeakMap();
    const track=(target,listener,add)=>{let set=registered.get(target);if(!set){set=new Set();registered.set(target,set);}if(add&&!set.has(listener)){set.add(listener);window.__qaMediaActive++;}else if(!add&&set.has(listener)){set.delete(listener);window.__qaMediaActive--;}};
    const add=MediaQueryList.prototype.addEventListener, remove=MediaQueryList.prototype.removeEventListener;
    MediaQueryList.prototype.addEventListener=function(type,listener,...args){if(type==='change')track(this,listener,true);return add.call(this,type,listener,...args);};
    MediaQueryList.prototype.removeEventListener=function(type,listener,...args){if(type==='change')track(this,listener,false);return remove.call(this,type,listener,...args);};
    const legacyAdd=MediaQueryList.prototype.addListener,legacyRemove=MediaQueryList.prototype.removeListener;
    MediaQueryList.prototype.addListener=function(listener){track(this,listener,true);return legacyAdd.call(this,listener);};
    MediaQueryList.prototype.removeListener=function(listener){track(this,listener,false);return legacyRemove.call(this,listener);};
  });
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(base);
  await page.waitForFunction(()=>document.querySelector('.fabric-render')?.dataset.sequence==='ready');
  const counts=[];
  counts.push(await page.evaluate(()=>window.__qaMediaActive));
  for(let i=0;i<3;i++){
    await page.locator('.header-links a[href="/community"]').click();
    await page.waitForURL(base+'/community');await page.waitForTimeout(200);
    assert(await page.locator('.pin-spacer').count()===0,'Pin survives scene unmount');
    await page.locator('.site-header .brand').click();await page.waitForURL(base+'/');
    await page.waitForFunction(()=>document.querySelector('.fabric-render')?.dataset.sequence==='ready');
    counts.push(await page.evaluate(()=>window.__qaMediaActive));
  }
  assert(counts.every(count=>count===counts[0]),'Media-query listeners accumulate: '+counts);
  const fabric=page.getByRole('link',{name:'Explore NASJ through the embroidered fabric'});
  await fabric.hover();
  await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/fabric/portal/')&&entry.responseEnd>0).length>=18);
  await page.route('**/platform**',async route=>{await new Promise(resolve=>setTimeout(resolve,6500));await route.continue();});
  await page.waitForTimeout(150);
  await fabric.click();
  await page.waitForTimeout(650);
  const canvasActive=await page.evaluate(()=>getComputedStyle(document.querySelector('.portal-textile canvas')).opacity);
  assert(canvasActive==='1','Prepared portal frames were not rendered');
  await page.waitForFunction(()=>document.querySelector('.portal-exit')?.dataset.active==='false',{timeout:10000});
  assert(await page.getByRole('status').filter({hasText:'direct link'}).isVisible(),'Stalled navigation did not offer recovery');
  const recovered=await page.evaluate(()=>({overlay:getComputedStyle(document.querySelector('.portal-exit')).visibility,bodyOverflow:getComputedStyle(document.body).overflow}));
  assert(recovered.overlay==='hidden','Watchdog leaves a covered interface');
  await page.waitForURL(base+'/platform',{timeout:15000});await page.unroute('**/platform**');
  // Reduced mobile transition, and scene fits at common small breakpoints.
  const layouts=[];
  for(const width of [320,375,390,768,900]){
    await page.setViewportSize({width,height:844});await page.goto(base);await page.waitForTimeout(200);
    const layout=await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,visual:document.querySelector('.hero-visual').getBoundingClientRect().toJSON(),request:document.querySelector('.hero-request').getBoundingClientRect().toJSON(),pins:document.querySelectorAll('.pin-spacer').length}));
    assert(layout.overflow===0 && layout.pins===0,'Responsive overflow/pinning at '+width);
    if(width<850)assert(layout.request.left>=0&&layout.request.right<=width,'Mobile mockup clipped at '+width);
    layouts.push(layout);
  }
  await page.setViewportSize({width:390,height:844});await page.goto(base);
  await page.getByRole('link',{name:'Explore NASJ through the embroidered fabric'}).click();
  await page.waitForURL(base+'/platform');
  assert(await page.locator('.portal-exit').getAttribute('data-active')==='false','Mobile portal stays active');
  return {mediaListenerCounts:counts,preparedPortalCanvas:canvasActive,stalledNavigationRecovery:recovered,responsiveLayouts:layouts,mobilePortal:'passed'};
}
