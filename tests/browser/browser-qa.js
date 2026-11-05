/* global window, document, performance, PerformanceObserver, getComputedStyle, innerWidth, scrollTo, setTimeout */
async page => {
  const root = 'http://127.0.0.1:3100';
  const out = 'test-results';
  await page.unrouteAll();
  const results = {};
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const pause = () => page.waitForTimeout(850);
  await page.addInitScript(() => {
    window.__qaCLS = 0;
    new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__qaCLS += entry.value; }).observe({type:'layout-shift',buffered:true});
  });
  await page.setViewportSize({width:1440,height:1000});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(root);
  await page.waitForFunction(()=>document.querySelector('.fabric-render')?.dataset.sequence==='ready');
  await page.evaluate(()=>document.fonts.ready);
  await pause();
  const initial = await page.evaluate(()=>({frame:document.querySelector('.fabric-canvas').dataset.frame,width:document.documentElement.scrollWidth,viewport:innerWidth,pins:document.querySelectorAll('.pin-spacer').length,portal:document.querySelector('.portal-exit').parentElement.tagName,cls:window.__qaCLS,resources:performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/fabric/')).map(entry=>({name:entry.name.split('/fabric/')[1],bytes:entry.encodedBodySize,duration:Math.round(entry.duration)}))}));
  assert(initial.frame==='0' && initial.pins===1 && initial.width===initial.viewport && initial.portal==='BODY','Initial composition/portal/pinning failed');
  await page.screenshot({path:out+'/nasj-after-desktop.png'});
  results.desktop = initial;
  const frames = [];
  for (const y of [250,650,1100,1950,650,0]) {
    await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y); await pause();
    frames.push(await page.locator('.fabric-piece .fabric-canvas').getAttribute('data-frame'));
    assert(page.url()===root+'/','Scrolling navigated unexpectedly');
  }
  assert(+frames[0]<+frames[1] && +frames[1]<+frames[2] && frames[1]===frames[4] && frames[5]==='0','Forward/reverse frame mapping failed');
  results.scrollFrames=frames;
  await page.evaluate(()=>scrollTo({top:2000,behavior:'instant'})); await pause();
  const scrollCoverage = await page.evaluate(()=>({opacity:getComputedStyle(document.querySelector('.scroll-fabric-cover')).opacity,heroTop:document.querySelector('.hero-stage').getBoundingClientRect().top}));
  assert(+scrollCoverage.opacity===1 && Math.abs(scrollCoverage.heroTop)<1,'Opening does not finish at the cloth close-up');
  await page.evaluate(()=>scrollTo({top:2300,behavior:'instant'})); await pause();
  const released = await page.locator('.hero-stage').evaluate(el=>el.getBoundingClientRect().top);
  assert(released < -250,'Normal page scroll was not released immediately after the animation');
  await page.locator('.portal-reveal').scrollIntoViewIfNeeded(); await pause();
  results.scrollHandoff={scrollCoverage,released};
  const bounds = await page.locator('.platform-journey').boundingBox();
  assert(bounds.y>80 && bounds.y+bounds.height<1000,'Reveal card clipped');
  await page.getByRole('tab',{name:'Request',exact:true}).click();
  assert(await page.getByRole('tabpanel').filter({visible:true}).getByText('Turn an idea into a clear brief.').isVisible(),'Request tab failed');
  await page.getByRole('tab',{name:'Request',exact:true}).press('ArrowRight');
  assert(await page.getByRole('tab',{name:'Coordinate'}).getAttribute('aria-selected')==='true','Tab keyboard navigation failed');
  await page.getByRole('tab',{name:'Discover',exact:true}).click();
  await page.screenshot({path:out+'/nasj-after-reveal.png'});
  results.reveal={bounds,tabs:'click and arrow keys passed'};
  // Duplicate clicks are synchronous; delay the local destination to inspect actual coverage.
  await page.route('**/platform**',async route=>{ await new Promise(resolve=>setTimeout(resolve,1700)); await route.continue(); });
  await page.locator('.reveal-text a').evaluate(link=>{link.click();link.click();});
  await page.waitForTimeout(1400);
  const coverage=await page.evaluate(()=>({parent:document.querySelector('.portal-exit').parentElement.tagName,opacity:getComputedStyle(document.querySelector('.portal-cover')).opacity,rect:document.querySelector('.portal-exit').getBoundingClientRect().toJSON(),busy:document.querySelector('.portal-exit').dataset.active}));
  assert(coverage.parent==='BODY' && +coverage.opacity>.98 && coverage.rect.width===1440 && coverage.rect.height===1000,'Portal did not cover the viewport before navigation: '+JSON.stringify(coverage));
  await page.screenshot({path:out+'/nasj-portal-coverage.png'});
  await page.waitForURL(root+'/platform',{timeout:10000}); await pause();
  assert(await page.locator('.portal-exit').getAttribute('data-active')==='false','Portal failed to reset after navigation');
  await page.unroute('**/platform**'); results.portal=coverage;
  // Exercise local route mount/unmount and responsive media cleanup repeatedly.
  await page.getByRole('link',{name:'Back to The First Thread'}).click(); await pause();
  for (let cycle=0;cycle<3;cycle++) {
    await page.setViewportSize({width:800,height:1000}); await pause();
    assert(await page.locator('.pin-spacer').count()===0,'Tablet pin leaked');
    await page.setViewportSize({width:1440,height:1000}); await pause();
    assert(await page.locator('.pin-spacer').count()===1,'Duplicate desktop pin');
  }
  results.mediaCleanup='3 desktop/tablet cycles: exactly one desktop pin, no tablet pins';
  // Browser API interceptions are installed before submitting: no real database writes.
  const submissions=[];
  await page.route('**/api/**',async route=>{submissions.push({url:route.request().url(),payload:route.request().postDataJSON()});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,message:'Mocked QA response'})});});
  await page.locator('.header-actions a').click(); await pause();
  const alpha=page.locator('.alpha-form');
  await alpha.locator('[name=fullName]').fill('QA Artisan'); await alpha.locator('[name=email]').fill('qa@example.invalid'); await alpha.locator('[name=role]').selectOption('artisan'); await alpha.locator('[name=testingInterest]').fill('Review the illustrative gifting journey.'); await alpha.locator('[name=consent]').check(); await alpha.getByRole('button',{name:'Join the First Thread'}).click();
  await alpha.getByRole('status').waitFor(); assert(await alpha.locator('.form-feedback.success').isVisible(),'Alpha success feedback missing');
  await page.goto(root+'/community');
  const craft=page.locator('.craft-form');
  await craft.locator('[name=contactName]').fill('QA Artisan'); await craft.locator('[name=email]').fill('qa@example.invalid'); await craft.locator('[name=participantType]').selectOption('cooperative'); await craft.locator('[name=region]').fill('Tunis'); await craft.locator('[name=aboutWork]').fill('Hand embroidered textile gifts made in our workshop.'); await craft.locator('[name=consent]').check();
  await craft.getByRole('button',{name:'Share your craft'}).click(); assert((await craft.getByRole('status').textContent()).includes('at least one'),'Craft validation failed');
  await craft.getByLabel('Embroidery',{exact:true}).check(); await craft.getByRole('button',{name:'Share your craft'}).click(); await pause();
  assert((await craft.getByRole('status').textContent()).includes('Thank'),'Craft success feedback missing');
  assert(submissions.length===2 && submissions[0].url.endsWith('/early-access') && submissions[1].url.endsWith('/craft-community') && submissions[1].payload.openToCollaboration===false && !('craftTypes' in submissions[0].payload),'Form purposes or consent mixed');
  await page.unroute('**/api/**'); results.forms={submissions:submissions.map(s=>({route:s.url.split('/api/')[1],fields:Object.keys(s.payload)})),database:'mocked; no live POST'};
  await page.setViewportSize({width:390,height:844});
  await page.goto(root); await pause();
  const mobile=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,pins:document.querySelectorAll('.pin-spacer').length,sequence:document.querySelector('.fabric-render').dataset.sequence,frames:performance.getEntriesByType('resource').filter(x=>x.name.includes('/fabric/scroll/')).length,cls:window.__qaCLS}));
  assert(mobile.width===390 && mobile.pins===0 && mobile.sequence==='poster' && mobile.frames===0,'Mobile overflow or animation download');
  await page.screenshot({path:out+'/nasj-after-mobile.png'});
  results.mobile=mobile;
  await page.setViewportSize({width:1440,height:1000}); await page.emulateMedia({reducedMotion:'reduce'}); await page.goto(root); await pause();
  const reduced=await page.evaluate(()=>({pins:document.querySelectorAll('.pin-spacer').length,frames:performance.getEntriesByType('resource').filter(x=>x.name.includes('/fabric/scroll/')).length,reveal:getComputedStyle(document.querySelector('.portal-reveal')).visibility,horizontal:document.documentElement.scrollWidth-innerWidth}));
  assert(reduced.pins===0 && reduced.frames===0 && reduced.reveal==='visible' && reduced.horizontal===0,'Reduced-motion fallback failed');
  await page.locator('.reveal-text a').click(); await page.waitForURL(root+'/platform');
  assert(await page.locator('.portal-exit').getAttribute('data-active')==='false','Reduced motion used long portal');
  results.reduced=reduced; results.errors=errors; assert(errors.length===0,'Browser runtime errors: '+errors.join(';'));
  return results;
}
