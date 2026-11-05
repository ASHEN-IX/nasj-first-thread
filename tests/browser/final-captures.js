/* global document, navigator, performance, scrollTo */
async page => {
  const root='http://127.0.0.1:3100';
  const out='test-results';
  await page.unrouteAll();await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1000});await page.goto(root);
  await page.waitForFunction(()=>document.querySelector('.fabric-render')?.dataset.sequence==='ready');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
  await page.screenshot({path:out+'/nasj-after-desktop.png'});
  await page.evaluate(()=>scrollTo({top:1000,behavior:'instant'}));await page.waitForTimeout(850);await page.screenshot({path:out+'/nasj-fabric-flight.png'});
  await page.evaluate(()=>scrollTo({top:2940,behavior:'instant'}));await page.waitForTimeout(850);await page.screenshot({path:out+'/nasj-after-reveal.png'});
  await page.setViewportSize({width:390,height:844});await page.goto(root);await page.waitForTimeout(400);await page.screenshot({path:out+'/nasj-after-mobile.png'});await page.locator('.hero-stage').screenshot({path:out+'/nasj-mobile-scene.png'});
  const constrained=await page.context().newPage();
  await constrained.setViewportSize({width:1440,height:1000});
  await constrained.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2});Object.defineProperty(navigator,'connection',{get:()=>({saveData:true})});});
  await constrained.goto(root);await constrained.waitForTimeout(500);
  const fallback=await constrained.evaluate(()=>({pins:document.querySelectorAll('.pin-spacer').length,frames:performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/fabric/scroll/')).length,poster:document.querySelector('.fabric-render').dataset.sequence}));
  if(fallback.pins!==0||fallback.frames!==0||fallback.poster!=='poster')throw new Error('Constrained desktop fallback failed');
  await constrained.close();
  const failed=await page.context().newPage();await failed.setViewportSize({width:1440,height:1000});
  await failed.route('**/fabric/scroll/005.webp',route=>route.fulfill({status:503,body:'unavailable'}));
  await failed.goto(root);await failed.waitForTimeout(850);
  const recoverable=await failed.evaluate(()=>({poster:document.querySelector('.fabric-render').dataset.sequence,link:!!document.querySelector('.hero-ctas a')}));
  if(recoverable.poster!=='poster'||!recoverable.link)throw new Error('Frame failure removed usable hero');
  await failed.close();
  return {constrainedDesktop:fallback,frameFailure:recoverable,captures:'fresh production-build desktop, flight, reveal, mobile and full mobile scene'};
}
