
const {expect, assert} = require('chai')

const CSSName = '.__cv_image .context'
const CSSNameInput = '.__cv_image input'
const CSSItems = '._cv_property fieldset'
const CSSTagButton = 'button'
const CSSTagInput = '._cv_property fieldset .el-input input'
const CSSClassButton = 'dev span span button'
const CSSClassSelector = '[id|=el-popover-]'
const CSSClassItems = 'div'
const TagIndex = 0
const ClassIndex = 1
const DetailIndex = 2

function testColor(page) {
  return page.$$('.main-color').then((colors) => {
    expect(colors).to.have.lengthOf(6)
    return new Promise(function(resolve, reject){
      resolve(1)
    })
  })
}

function testMeta(page) {
  return page.$$('.value').then((meta) => {
    assert(meta.length >= 2)
    return new Promise(function(resolve, reject){
      resolve(2)
    })
  })
}

async function getItem(page, index) {
  await page.waitForSelector(CSSItems)
  const items = await page.$$(CSSItems)
  return items[index]
}


module.exports = {
  updateName: async function(page, name) {
    await page.waitForSelector(CSSName)
    let items = await page.$$(CSSName)
    await page.waitForTimeout(1000)
    assert(items.length > 0)
    // await page.waitForTimeout(1000)
    await items[0].click({ clickCount: 2, delay: 100 })
    await page.waitForSelector(CSSNameInput)
    const input = await page.$(CSSNameInput)
    input.type(name)
    await page.waitForTimeout(1000)
    await input.press('Enter')
    await page.waitForTimeout(1500)
    await page.waitForSelector(CSSName)
    const value = await page.evaluate((selector) => document.querySelector(selector).innerHTML, CSSName)
    // assert(value === name)
  },
  addTag: async function(page, value) {
    const tag = await getItem(page, TagIndex)
    const btnAdd = await tag.$(CSSTagButton)
    await btnAdd.click()
    await page.waitForSelector(CSSTagInput)
    const input = await page.$(CSSTagInput)
    input.type(value)
    await page.waitForTimeout(1000)
    await input.press('Enter')
  },
  removeTag: async function(page) {
    const tag = await getItem(page, TagIndex)
    let btnX = await tag.$$('span i')
    const originCount = btnX.length
    assert(originCount > 0)
    await btnX[originCount - 1].click()
    await page.waitForTimeout(1000)
    try {
      await tag.waitForSelector('span i', {timeout: 1500})
      btnX = await tag.$$('span i')
      const currentCount = btn.length
      assert(originCount === (currentCount + 1))
    } catch (err) {
    }
  },
  getTagCount: async function (page) {
    await page.waitForSelector(CSSItems)
    const items = await page.$$(CSSItems)
    return items[0].length
  },
  getClassCount: async function (page) {
    await page.waitForSelector(CSSItems)
    const items = await page.$$(CSSItems)
    return items[1].length
  },
  getCurrentResourceName: async function (page) {
    // In grid view
    await page.waitForSelector(CSSName)
    await page.waitForTimeout(500)
    let items = await page.$$(CSSName)
    const value = await page.evaluate(item => {
      return item.innerHTML
    }, items[items.length - 1])
    return value
  },
  getProperties: async function (page) {}
}