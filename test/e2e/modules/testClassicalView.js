const base = require('./base')
const {expect, assert} = require('chai')
const search = require('./testSearch')
const content = require('./testContentPanel')
const classify = require('./testClassifyPanel')

const CLASSICAL_LAYOUT = 0
const SelectionIndex = 0

const CSSFolder = '.folder'
const CSSImage = '._cv_waterfall'
const CSSMenus = '.cm-container li'

async function selectResource(page) {
  await base.switchLayout(page, CLASSICAL_LAYOUT)
  await page.waitForSelector(CSSImage)
  const images = await page.$$(CSSImage)
  assert(images.length > 0)
  await images[SelectionIndex].click()
}

async function showMenu(page) {
  await page.waitForSelector(CSSImage)
  const images = await page.$$(CSSImage)
  await images[SelectionIndex].click({button: 'right'})
}

async function validName(page, name) {
  const images = await page.$$(CSSImage)
  const imageName = await images[SelectionIndex].evaluate(() => document.querySelector('.context').innerHTML)
  console.info('image name', imageName)
  // assert(name === imageName)
}

async function removeResource(page) {
  let images = await getResources(page)
  const beforeRemoveLen = images.length
  await page.waitForSelector(CSSMenus)
  const menus = await page.$$(CSSMenus)
  assert(menus.length > 0)
  await menus[menus.length - 1].click()
  await page.waitForTimeout(1000)
  images = await getResources(page)
  if (images) {
    assert(beforeRemoveLen > images.length)
  }
  // const counts = await base.getCounts(page)
  // assert(counts[0] === images.length)
  // assert(counts[1] === images.length)
  // assert(counts[2] === images.length)
}

async function selectClass(page) {
  await base.switchLayout(page, CLASSICAL_LAYOUT)
  await page.waitForSelector(CSSFolder)
  const folders = await page.$$(CSSFolder)
  assert(folders.length > 0)
}

async function getResources(page) {
  try {
    await page.waitForSelector(CSSImage, {timeout: 2000})
  } catch (err) {
    return null
  }
  const images = await page.$$(CSSImage)
  return images
}

async function showResourceContent(page) {
  const resources = await getResources(page)
  assert(resources !== null)
  await resources[0].click({ clickCount: 2, delay: 100 })
  const result = await content.isPanelDisplay(page)
  assert(result === true)
}

module.exports = {
  selectResource: selectResource,
  showMenu: showMenu,
  validName: validName,
  search: async function(page) {
    await base.switchLayout(page, CLASSICAL_LAYOUT)
    await search.searchByKeyword(page, 'green')
  },
  removeResource: removeResource,
  selectClass: selectClass,
  intoClass: async function(page) {
    await base.switchLayout(page, CLASSICAL_LAYOUT)
  },
  removeClass: async function(page) {
    await base.switchLayout(page, CLASSICAL_LAYOUT)
  },
  test: async function(page) {
    const property = require('./testResourceProperty')
    await selectResource(page)
    const newName = 'Image0'
    const name = await property.getCurrentResourceName(page)
    assert(name.length !== 0 && name !== undefined && name !== newName)
    await property.updateName(page, newName)
    await property.addTag(page, 'green')
    await validName(page, newName)
    
    // search
    await search.searchByKeyword(page, 'green')
    await page.waitForTimeout(5000)

    await property.removeTag(page)

    // display content of resource
    await classify.selectNavigation(page, 0)
    await showResourceContent(page)
    // console.info('6666666666')

    // right menu
    // await base.switchLayout(page, CLASSICAL_LAYOUT)
    await page.waitForTimeout(2000)
    await classify.selectNavigation(page, 0)
    // await showMenu(page)
    // console.info('7777777777')
    // await removeResource(page)
    // const counts = await base.getCounts(page)
    // // total count is zero
    // assert(counts[0] = 0)
    // // total unclass file is zero
    // assert(counts[1] = 0)
    // // total untag file is zero
    // assert(counts[2] = 0)
  }
}