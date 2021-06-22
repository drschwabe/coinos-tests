const config = require('./config')

const test = require('tape')
const puppeteer = require('puppeteer')

const delay = async seconds => 
  await new Promise(r => setTimeout(r, seconds ? seconds * 1000 : 1000 ))

const openCoinosHome = async () => {
  return new Promise(async resolve => {
    const browser = await puppeteer.launch( {headless: false, defaultViewport: null } )
    const page = await browser.newPage()
    await page.goto(config.baseUrl, {waitUntil: 'networkidle2'})
    resolve([browser,page])
  })
}

test('Can open homepage', async t => {
  const [browser,page] = await openCoinosHome() 
  await delay(3) 

  const body = await page.evaluate(() => document.body.innerText )
  t.ok(body.search('Send and receive bitcoin') > -1, `Homepage loads OK (displays "Send and receive bitcoin")`)

  await browser.close()
  t.end()
})


test('Can create an anonymous account', async t => {
  const [browser,page] = await openCoinosHome() 
  
  await delay(3) 
  
  const buttonSpan = await page.$x("//span[contains(., 'Use Anonymously')]")
  await buttonSpan[0].click()
  
  await delay(4) 
  
  const body = await page.evaluate(() => document.body.innerText )

  t.ok(body.search('No payments yet') > -1, `Anonymous account created OK (displays "No payments yet")`)
  t.ok(body.search('0.00') > -1, 'New account page shows a 0.00 balance')

  await browser.close()

  t.end()
})


test('Can change username and password', async t => {
  const [browser,page] = await openCoinosHome() 
    
  await delay(3) 
  
  const anonButtonSpan = await page.$x("//span[contains(., 'Use Anonymously')]")
  await anonButtonSpan[0].click()

  await delay(3) 
  
  let userButtonSpan = await page.$x("//span[contains(., 'satoshi')]")
  await userButtonSpan[0].click()
  await delay(1) 

  const settingsDiv = await page.$x("//div[contains(., 'Settings')]")
  await settingsDiv[5].click()
  
  await delay(4) 
  
  let body = await page.evaluate(() => document.body.innerText )
  t.ok(body.search('Your public page') > -1, `Setting page loads OK (shows 'Your public page')")`)

  await page.focus('input')

  await page.evaluate( () => document.getElementsByTagName("input")[0].value = "")
  await delay(2)

  //create a new user account with a randomized ending so as to ensure (not guaranteed) unique: 
  const userName = 'penguinfan' + Math.floor(Math.random() * (99999999 - 1000) + 1000)
  await page.keyboard.type( userName )
  await delay(1)

  const saveSpan = await page.$x("//span[contains(., 'Save')]")
  await saveSpan[0].click()

  await delay(2)

  body = await page.evaluate(() => document.body.innerText )
  t.ok(body.search(config.baseUrl + userName) > -1, `Username updated successfully`)

  await delay(4)

  const passButtonSpan = await page.$x("//span[contains(., 'Change Password')]")
  await passButtonSpan[0].click()

  await page.keyboard.type('anarchocapitalist')
  await page.keyboard.press("Tab")
  await page.keyboard.type('anarchocapitalist')
  await delay(1)

  await saveSpan[0].click()
  await delay(2)

  //now logout and try logging in with the new creds: 
  userButtonSpan = await page.$x(`//span[contains(., ${userName})]`)
  await userButtonSpan[0].click()
  await delay(1) 
  const signoutButton = await page.$x("//button[contains(., 'Sign Out')]")
  await signoutButton[0].click()
  await delay(4) 

  body = await page.evaluate(() => document.body.innerText )
  t.ok(body.search('Send and receive bitcoin') > -1, `Signed out ok (we are now back to default message)`)

  await page.focus('input')
  await page.keyboard.type(userName)
  await page.keyboard.press("Tab")
  await page.keyboard.type('anarchocapitalist')
  await page.keyboard.press("Enter")
  await delay(2) 

  body = await page.evaluate(() => document.body.innerText )
  t.ok(body.search('No payments yet') > -1, `Logged back in OK with the updated credentials`)
  await delay(1) 
  
  await browser.close()
  t.end()
})


test('Can register an account', async t => {
  const [browser,page] = await openCoinosHome() 

  const registerAccountButtonSpan = await page.$x("//span[contains(., 'Register An Account')]")
  await registerAccountButtonSpan[0].click()
  await delay(2) 

  const userName = 'penguinfan' + Math.floor(Math.random() * (99999999 - 1000) + 1000)
  await page.keyboard.type( userName )
  await page.keyboard.press('Tab')
  await page.keyboard.type( config.email )
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.type('anarchocapitalist')
  await delay(2) 

  const registerButtonSpan = await page.$x("//span[contains(., 'Register')]")
  await registerButtonSpan[0].click()
  await delay(3) 

  let body = await page.evaluate(() => document.body.innerHTML )
  t.ok(body.search('No payments yet') > -1, `Anonymous account created OK (displays "No payments yet")`)
  t.ok(body.search('0.00') > -1, 'New account page shows a 0.00 balance')

  const pathname = await page.evaluate(() => window.location.pathname)
  t.equals(pathname, '/home', 'resulting URL pathname is /home')
  
  t.ok(body.search(userName) > -1, `The new user is logged in (userName is displayed on page)`)
  
  await delay(1) 
  await browser.close()
  t.end() 
})

test('Cannot register account if input fields are invalid', async t => {
  const clickRegister = async () => {
    return new Promise(async resolve => {
      const registerButtonSpan = await page.$x("//span[contains(., 'Register')]")
      await registerButtonSpan[0].click()
      await delay(2) 
      resolve()
    })
  }
  
  const [browser,page] = await openCoinosHome() 
  const userName = 'bruinsfan' + Math.floor(Math.random() * (99999999 - 1000) + 1000)

  await page.goto(config.baseUrl + 'register', {waitUntil: 'networkidle2'})

  //### skip username ### 
  await page.keyboard.press('Tab') //< where username normally would go
  await page.keyboard.type( config.email )
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.type('anarchocapitalist')
  await clickRegister()

  let body = await page.evaluate(() => document.body.innerHTML )
  t.ok(body.search('Name is required') > -1, `User is warned that 'Name is required'`)
  t.ok(body.search('Email is required') === -1, `User not warned about email since that was entered OK`)
  
  let pathname = await page.evaluate(() => window.location.pathname)
  t.equals(pathname, '/register', 'user was prevented from registering (URL did not change)')

  //### skip email ### 
  await page.goto(config.baseUrl + 'register', {waitUntil: 'networkidle2'})

  await page.keyboard.type( userName )  
  await page.keyboard.press('Tab') //< where email would go 
  await page.keyboard.press('Tab')
  await page.keyboard.type('anarchocapitalist')
  await clickRegister()

  body = await page.evaluate(() => document.body.innerHTML )
  t.ok(body.search('Name is required') === -1, `User is not warned about name since that was entered OK'`)
  t.ok(body.search('Email is required') > -1, `User is warned that 'Email is required'`)
  pathname = await page.evaluate(() => window.location.pathname)
  t.equals(pathname, '/register', 'user was prevented from registering (URL did not change)')

  //### invalid email ### 
  await page.goto(config.baseUrl + 'register', {waitUntil: 'networkidle2'})

  await page.keyboard.type( userName )  
  await page.keyboard.press('Tab') 
  await page.keyboard.type( 'zfsdfasdfasdf' ) //< jibberish email
  await page.keyboard.press('Tab') 
  await page.keyboard.press('Tab') //< skip phone
  await page.keyboard.type('anarchocapitalist')
  await clickRegister()

  body = await page.evaluate(() => document.body.innerHTML )
  t.ok(body.search('E-mail must be valid') > -1, `User is warned that 'Email must be valid'`)
  pathname = await page.evaluate(() => window.location.pathname)
  t.equals(pathname, '/register', 'user was prevented from registering (URL did not change)')

  await delay(1) 
  await browser.close()
  t.end() 
})