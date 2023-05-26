---
title: "SSRF 실습 문제 Basic SSRF"
excerpt: "SSRF 실습 문제 Basic SSRF 문제를 풀어보자. "
tags:
    - SSRF
    - 웹 해킹
last_modified_at: 2023-05-27T09:13:00-05:00
---

## SSRF 란?
- 서버가 임의의 요청을 보내도록 하는 공격이다.

## SSRF 문제
- [Lab: Basic SSRF against the local server Web Security Academy](https://portswigger.net/web-security/ssrf/lab-basic-ssrf-against-localhost)

## 문제 내용
- 수량 체크를 하기위해 내부 시스템으로 부터 데이터를 가지고온다.
- 문제를 해결하기 위해서는 `http://localhost/admin` 에 접근하여 `carlos` 유저를 삭제해야 한다.

![Pasted image 20230527001755](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/9b364c73-85b0-4f2a-a73e-5631530108f2)



## 문제 풀이

### 사이트 분석 및 취약점 찾기

#### 상품 수량 체크부분
<img class="mermaid" src="https://mermaid.ink/svg/eyJjb2RlIjoic2VxdWVuY2VEaWFncmFtXG7sgqzsmqnsnpAgLT4-IOyEnOuyhCA6IOygleyDgeyggSDsiJjrn4kg7JqU7LKtXG7shJzrsoQgLT4-IOuCtOu2gCDshJzrsoQgOiDrp4Htgazrpbwg7Ya17ZW0IOuCtOu2gCDtjpjsnbTsp4Ag7IiY65-JIOyalOyyrS5cbuuCtOu2gCDshJzrsoQgLT4-IOyEnOuyhCA6IOyImOufiSDsnZHri7UuXG7shJzrsoQgLT4-IOyCrOyaqeyekCA6IOyImOufiSDsnZHri7UuIiwibWVybWFpZCI6bnVsbH0">
- 상품 수량 체크부분 POST요청의 파라미터로 URL을 넣어 요청을 보낸다. 즉 이 부분에서 SSRF 공격을 시도할 수 있다.<br>![Pasted image 20230527005245](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/f524fe2c-5897-4609-99d4-13cf520f00af)
<br>![Pasted image 20230527004914](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/4b5fcdad-9c15-4476-ba8a-6d15e871f04a)
<br>![Pasted image 20230527005001](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/f6958d20-01a0-4146-85f3-10fa5ac1d1cc)

- 오직 POST 요청으로만 수량을 체크할 수 있다. GET 요청을 보냈을 때 수량을 체크할 수가 없다.<br>![Pasted image 20230527005515](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/8c0aa1bc-d813-4ffd-a0c0-278bb16187e6)


#### admin 페이지 접속 시도
- `https://문제 주소/admin` 을 통해 바로 접속을 시도해 보았다. 하지만 admin 페이지에 접속하기 위해서는 `administrator`로 로그인 하거나 내부에서 접속해야 한다.<br>![Pasted image 20230527005910](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/0656feeb-8612-43ea-9104-5834bc6fa8de)

### 공격 시나리오
<img class="mermaid" src="https://mermaid.ink/svg/eyJjb2RlIjoic2VxdWVuY2VEaWFncmFtXG7qs7XqsqnsnpAgLT4-IOyEnOuyhCA6IOu5hOygleyDgSDtjpjsnbTsp4Ag7YyM652866-47YSw66W8IOuEo-ydgCDsiJjrn4kg7JqU7LKtXG7shJzrsoQgLT4-IOuCtOu2gCDshJzrsoQgOiDrgrTrtoAg7Y6Y7J207KeAIOyalOyyrVxu64K067aAIOyEnOuyhCAtPj4g7ISc67KEIDog64K067aAIO2OmOydtOyngCDsnZHri7VcbuyEnOuyhCAtPj4g6rO16rKp7J6QIDog64K067aAIO2OmOydtOyngCDsnZHri7UiLCJtZXJtYWlkIjpudWxsfQ">
1. 서버로 수량 체크 요청을 보낼 때 수량을 체크하기 위한 링크가 아닌 서버 내부 페이지 URL를 파라미터에 넣어 요청을 보낸다.
2. 서버에서 파라미터에 들어있는 URL주소로 요청을 보낸다.
3. 서버는 URL주소 응답을 받는다.
4. 서버는 공격자에게 URL 페이지 응답을 그대로 사용자에게 보내준다.

### admin 페이지 접속 공격
1. `stockApi` 파라미터에 `http://localhost/admin` 주소를 입력해 준다.<br>![Pasted image 20230527013431](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/d9bd18c0-c348-452a-9461-5b447cea2613)
2. Post 요청을 보내면 `http://localhost/admin` 페이지가 나타난다. 이 페이지는 서버 내부에서 접속된 페이지이다.<br>![Pasted image 20230527013531](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/78ea87bd-3af3-49f8-901f-ef992bb0e96b)
3. admin 페이지 접속에 성공하였다. 이제 `carlos` 유저를 삭제하면 된다. 즉 위의 사진에서 보이듯 `Delete`  링크를 눌러줘야한다. 하지만 바로 누르면 외부에서 요청한 것이라 동작을 안한다. 따라서 파라미터에 `Delete링크`를 넣어 요청을 보내주면 된다.<br>![Pasted image 20230527014116](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/8c857d16-ae1a-43b1-9554-d6a120b4857b)


### 유저 삭제하기
1. `stockApi` 파라미터에 `http://localhost/admin/delete?username=wiener` 링크를 입력해 준다.<br>![Pasted image 20230527014517](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/9a578c2c-cf4c-4a87-84b6-b1ac926dce87)
2. Post 요청을 보내면 성공적으로 `wiener` 유저가 삭제되었다.<br>![Pasted image 20230527014556](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/7fedaef1-78ee-4b7a-9688-272fa5f7a01b)
3. 목표는 `carlos` 유저를 삭제하는 것이다. 따라서 `carlos` 를 링크에 넣어주자. 그러면 `stockApi` 파라미터에는 `http://localhost/admin/delete?username=carlos` 가 들어가게 된다.<br>![Pasted image 20230527015033](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/9061f31e-2a9a-4dc0-b986-1b01007c2a51)
4. Post 요청을 보내면 목표였던  `carlos` 유저가 삭제된다.<br>![Pasted image 20230527015153](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/d34a3ef7-cc64-4595-b6a3-05f7e26bb06a)


## 후기
- 직접 스터디에서 풀이해 주었지만 직접 SSRF 문제를 풀어보니 파라미터로 URL을 입력받는 것이 얼마나 위험한지 알 수 있었다. SSRF 취약점을 이용하면 외부에서 접근이 불가능한 내부 페이지에 접속을 직접 확인할 수 있어 재밌었다. 