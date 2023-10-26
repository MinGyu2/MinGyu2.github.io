---
title: "Selenium in Python 유용한 정보"
excerpt: "Selenium 사용할 때 유용한 정보를 정리해 보았다."
categories:
    - 기술
tags:
    - selenium
    - python
last_modified_at: 2023-10-19T09:13:00-05:00
---

## Selenium 브라우저 드라이버 경로 주기

- 브라우저 드라이버 경로를 직접 설정해 줄 수 있다.

```python
from selenium import webdriver
from selenium.webdriver.edge.service import Service

edge_path = 'msedgedriver.exe'
service = Service(executable_path=edge_path)
driver = webdriver.Edge(service = service)
```

## Selenium find_element or find_elements
- find_element 또는 find_elements 를 통해 원하는 element를 얻어줄 수 있다.

```python
from selenium.webdriver.common.by immport By

driver.find_element(By.XPATH, '...')
driver.find_element(By.ID,'ID')
driver.find_element(By.NAME,'NAME')
driver.find_element(By.CLASS_NAME, 'Class name')
driver.find_element(By.CSS_SELECTOR, 'selector')

driver.find_elements(By.XPATH, '...')
driver.find_elements(By.ID,'ID')
driver.find_elements(By.NAME,'NAME')
driver.find_elements(By.CLASS_NAME, 'Class name')
driver.find_elements(By.CSS_SELECTOR, 'selector')
```


## Selenium 클릭
- 먼저 element 를 찾아주어야 한다. ( 클릭할 element 찾아주기. )

```python
bt = driver.find_elements(By.ID,'ID')

bt[0].click()
```

```python
from selenium.webdriver.common.keys import Keys

bt = driver.find_elements(By.ID,'ID')
bt.send_keys(Keys.ENTER)
```


## Selenium 글 입력
- element (input 등) 에 사용자 입력을 넣어줄 수 있다.

```python
id = driver.find_elements(By.ID,'login_id')
pwd = driver.find_elements(By.ID,'login_pwd')

id.send_keys('id')
pwd.send_keys('password')
```

## Selenium 프로그램 끝나도 자동 종료 안되게 하기

- 단 selenium 을 실행시킨 터미널을 끄면 selenium 브라우저도 같이 종료되는 것을 확인할 수 있다.

```python
options = webdriver.EdgeOptions()
options.add_experimental_option("detach", True)

driver = webdriver.Edge(options=options)
```

## Selenium Alert 창 제어하기

- Alert 창이 떴을 때 제어하지 않고 작업을 진행하면 UnexpectedAlertPresentException 오류가 발생한다.

```python
try:
	driver.get('xxx')
except UnexpectedAlertPresentException:
	# 자동으로 alert 창이 닫긴다.
	pass

또는

while True:
	try:
		driver.get('xxx')
		break
	except UnexpectedAlertPresentException:
		# 자동으로 alert 창이 닫긴다.
		pass
```

## Selenium element 소스 코드 확인하기

- element 의 소스 코드를 쉽게 확인해볼 수 있다.

```python
ele = driver.find_element(By.ID,'아이디')
ele.get_attribute('outerHTML')
```

## Selenium 브라우저 크기 설정

- 첫 브라우저를 열기전에 사용하면 된다. 브라우저가 열리고 나서는 크기를 조절할 수 없다.

```python
driver = webdriver.Edge()
driver.set_window_size(1024,800)
```


## Selenium 새창 열기 (새로운 탭 열기)

- 자바 스크립트 코드를 이용하여 새로운 창을 열 수 있다.

```python
# 처음 URL 열기.
driver.get(url)
# 새로운 창 만들기.
driver.execute_script("window.open('');")

# 새로운 창으로 전환 및 새로운 URL 로 이동
driver.switch_to.window(driver.window_handles[1])
driver.get(new_url)
```


## 참고 사이트

- [python - Webdriver call with executable path deprecated - Stack Overflow](https://stackoverflow.com/questions/70886308/webdriver-call-with-executable-path-deprecated)
- [seleniumhq.github.io/examples/python/tests/browsers/test_edge.py at trunk · SeleniumHQ/seleniumhq.github.io](https://github.com/SeleniumHQ/seleniumhq.github.io/blob/trunk//examples/python/tests/browsers/test_edge.py#L54)
- [저장소 :: selenium에서 Alert 제어 방법 (tistory.com)](https://yukifox.tistory.com/entry/selenium%EC%97%90%EC%84%9C-Alert-%EC%A0%9C%EC%96%B4-%EB%B0%A9%EB%B2%95)
- [How to get HTML source of a Web Element in Selenium WebDriver BrowserStack](https://www.browserstack.com/guide/get-html-source-of-web-element-in-selenium-webdriver)
- [python - How to set browser's width and height in Selenium WebDriver? - Stack Overflow](https://stackoverflow.com/questions/15397483/how-to-set-browsers-width-and-height-in-selenium-webdriver)
- [Opening and Closing Tabs Using Selenium - GeeksforGeeks](https://www.geeksforgeeks.org/opening-and-closing-tabs-using-selenium/)
- [python Selenium - 웹페이지 Alert창 종류와 관리 (tistory.com)](https://couplewith.tistory.com/448)
- [find_element By로 정리하기 (tistory.com)](https://dejavuqa.tistory.com/109)
- [Selenium 으로 간단한 매크로 만들기 python (tistory.com)](https://ssamko.tistory.com/9)