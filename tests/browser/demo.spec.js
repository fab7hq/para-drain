import { test, expect } from '@playwright/test';

test('the production scene loads locally and exposes the final product',async({page},info)=>{
  const errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173') && !r.url().startsWith('data:'))external.push(r.url());});
  await page.goto('/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
  const state=await page.evaluate(()=>window.demoState());
  expect(state.version).toBe('0.1.0');expect(state.actors).toBe(17);expect(state.playing).toBe(false);
  await expect(page.locator('#viewport canvas')).toBeVisible();
  await expect(page).toHaveTitle('ParaDrain — Twin-basket drain filter');
  await expect(page.locator('.brand')).toContainText('PARADRAIN');
  await expect(page.locator('footer')).toContainText('Fab7 / RingFrame');
  await expect(page.locator('main')).not.toContainText(/Fab7|RingFrame/);
  expect(state.markings).toEqual(['PARADRAIN UPSTREAM','PARADRAIN UPSTREAM']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('h1').textContent()).toMatch(/drain\s+moving/);
  expect(errors).toEqual([]);expect(external).toEqual([]);
  await page.screenshot({path:info.outputPath('initial.png'),fullPage:true});
});

test('play, pause, scrub, chapter jumps and reset work',async({page},info)=>{
  await page.goto('/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
  await page.getByRole('button',{name:'Play demonstration',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.demoState().time)).toBeGreaterThan(.3);
  await page.getByRole('button',{name:'Pause demonstration',exact:true}).click();
  const paused=await page.evaluate(()=>window.demoState().time);await page.waitForTimeout(150);
  expect(await page.evaluate(()=>window.demoState().time)).toBe(paused);
  await page.locator('#timeline').fill('19.75');
  await expect(page.locator('#phase-title')).toHaveText('Empty over the collection bin');
  await page.screenshot({path:info.outputPath('emptying.png'),fullPage:true});
  await page.locator('#chapters button').last().click();
  await expect(page.locator('#phase-title')).toHaveText('Return it as the backup');
  await page.getByRole('button',{name:'Restart demonstration'}).click();
  expect(await page.evaluate(()=>window.demoState().time)).toBe(0);
});

test('view controls and technical guide remain usable',async({page},info)=>{
  await page.goto('/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
  await page.getByRole('button',{name:'Product detail',exact:true}).click();
  await expect(page.locator('#closeup')).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Cutaway',exact:true}).click();
  expect(await page.evaluate(()=>window.demoState().cutaway)).toBe(true);
  await page.getByRole('button',{name:'Rain on',exact:true}).click();
  await expect(page.getByRole('button',{name:'Rain off',exact:true})).toHaveAttribute('aria-pressed','false');
  await page.screenshot({path:info.outputPath('detail.png'),fullPage:true});
  await page.getByRole('link',{name:'Technical guide'}).click();
  await expect(page.locator('h1')).toContainText('ParaDrain 0.1');
  await expect(page.locator('table')).not.toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const path of ['/model/paradrain.blend','/model/paradrain.json','/docs/specification.md','/LICENSE','/NOTICE','/THIRD_PARTY_NOTICES.txt']) {
    const response=await page.request.get(path);expect(response.ok(),path).toBe(true);
  }
  await page.screenshot({path:info.outputPath('technical.png'),fullPage:true});
  await expect(page.locator('footer')).toContainText('Fab7 / RingFrame');
  await expect(page.locator('main')).not.toContainText(/Fab7|RingFrame/);
});

test('unavailable 3D assets show the static technical fallback',async({page})=>{
  await page.route('**/model/paradrain.json',route=>route.abort());
  await page.goto('/');await expect(page.locator('#fallback')).toBeVisible();
  await expect(page.locator('#fallback img')).toBeVisible();
  await expect(page.locator('#fallback a')).toHaveAttribute('href','./technical.html');
});
