---
title: "[wargame.kr] fly me to the moon 문제"
excerpt: "fly me to the moon 문제 풀이."
categories:
    - dreamhack
tags:
    - wargame
    - js
    - request
last_modified_at: 2023-08-28T09:13:00-05:00
---

[문제](https://dreamhack.io/wargame/challenges/324)

## 요청 위조 (방법 1)
- 게임이 완료되고 요청하는 점수와 토큰 값을 위조해주면 된다.

### 분석
- token 값을 일정 주기로 받아오는 것을 확인할 수 있다.
- 게임 완료 시 토큰 값과 게임 점수를 같이 전송하는 것을 확인할 수 있다.
- 게임을 시작할 때는 token 값을 안 받아오는 것을 확인할 수 있었다.

### 공격
- burp suite 의 intercept 기능을 이용하여 31337 이상으로 만들어 요청을 보내주면 된다.

```
token=9355&score=3000000
```


## javascript 위조 (방법 2)
- js 방어법을 우회하는 방법을 이용하였다.
- javascipt 를 이용한 게임이기 때문에 javascipt 코드를 위조하여 점수를 마음대로 바꿀 수 있다.
- js 코드를 분석해 보면 사람이 못 알아보게 encode 되어 있는 것을 확인할 수 있다.
- 따라서 사람이 알아볼 수 있게 `de4js` 를 이용하여 decode 를 진행해 주었다.

### 코드 위조
- 코드를 보면 다음 위치에서 점수를 서버로 보내는 것을 확인할 수 있다.

```js
    if (BTunnelGame.checkLife()) {
        setTimeout('updateTunnel()', 10)
    } else {
        $('img#ship').fadeOut('slow');
        $('img.left_wall').css('display', 'none');
        $('img.right_wall').css('display', 'none');
        $.ajax({
            type: 'POST',
            url: 'high-scores.php',
            data: 'token=' + token + '&score=' + BTunnelGame.getScore(),
            success: function (_0x8618x19) {
                showHighScores(_0x8618x19)
            }
        })
    }
};
```

- `score=` 부분의 점수를 위조해주면 된다.

```js
        $.ajax({
            type: 'POST',
            url: 'high-scores.php',
            data: 'token=' + token + '&score=' + 3000000,
            success: function (_0x8618x19) {
                showHighScores(_0x8618x19)
            }
        })
```

- 이렇게 위조하여 완성 js 코드를 intercept 기능을 이용하여 원래 코드를 지우고 위조 코드를 붙여 넣어주면 된다.


## 비 정상 요청 (방법 3)
- 분석 결과 token 요청 후 받은 토큰 값과 점수를 같이 서버로 보낸다.

### 공격
- 먼저 토큰 값을 get 요청으로 받아준다.

```
http://서버 주소/token.php
```

- 그 다음 위에서 받은 토큰 값과 점수를 POST 요청으로 보내주면 된다. 

```
http://서버 주소/high-scores.php

token=토큰 값&score=30000000000
```

- 여기서 GET 요청 할 때 와 POST 요청할 때의 PHPSESSID 쿠키 값이 같아야 한다.


## 참고 사이트
- [de4js](https://lelinhtinh.github.io/de4js/)