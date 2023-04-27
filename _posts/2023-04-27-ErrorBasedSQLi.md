---
title: "Error Based SQL Injection 연습"
excerpt: "error based sql injection 을 연습하기 위하여 직접 db 에러를 보여주는 로그인 페이지를 만들었다."
tags:
    - Oracle DB
    - DB
    - sql injection
last_modified_at: 2023-04-27T09:13:00-05:00
---
- Error Based SQL Injection을 연습하기 위해 DB 에러를 보여주는 로그인 페이지를 만들었다.



### 조건
- SQL 질의문 결과가 화면에 안보임. (로그인, 아이디 중복 체크)
- DB Error 메세지가 화면에 출력되어야 한다.


### SQLi 취약점 서버 환경
---
- 웹서버 : 우분투 Ubuntu 22.04.2 LTS
- DB 서버 : Oracle DB oracle-database-xe-21c



### 과정
---
1. 서버에서 어떤 질의문을 사용하고 있는지 추측하기.
```sql
select xxx from xxx where id='x' ....
```
![Pasted image 20230427144207](https://user-images.githubusercontent.com/31990118/234779915-76b7335a-3e35-4f0f-97de-a902fe96ad7b.png)
2. 의도적으로 오류 발생 시킨다음 오류 내용 확인 한다. SQL 오류가 출력되는 것을 확인할 수 있다.
```sql
입력 = x'
```
![Pasted image 20230427144608](https://user-images.githubusercontent.com/31990118/234780248-2ebfb6be-ab2c-4952-879c-72825539b485.png)
3. Error Based SQL Injection Function 동작하는지 확인하기. `test` 단어가 오류에 출력되는 것을 확인할 수 있다.<br><script src="https://gist.github.com/MinGyu2/293d020a722eab98690d36a3d0941b2d.js"></script><br>![Pasted image 20230427145024](https://user-images.githubusercontent.com/31990118/234782415-65e101a8-f895-4990-ab70-23b9ee55828e.png)
4. 사용자 이름 구하기. `C##DBFORPROB` 라는 것을 알 수 있다.<br><script src="https://gist.github.com/MinGyu2/bece6ae6ed2f5d8876d443bb48e43594.js"></script><br>![Pasted image 20230427145221](https://user-images.githubusercontent.com/31990118/234782649-f607470f-6044-4410-b577-819ff2a794d8.png)
5. **Table** 이름 구하기. `MEMBERS` 테이블이 존재하는 것을 확인할 수 있다.<br><script src="https://gist.github.com/MinGyu2/e6bac283e7b366b8b86d8cb0aa8af81e.js"></script><br>![Pasted image 20230427150937](https://user-images.githubusercontent.com/31990118/234783063-ee4f03be-69e8-49f9-b0df-0d9949055a5e.png)
6. **column** 이름 구하기.<br><script src="https://gist.github.com/MinGyu2/18aed7c05b1894da21c4f243ecf50fc7.js"></script><br>![Pasted image 20230427151541](https://user-images.githubusercontent.com/31990118/234784240-620cbc18-efed-4af0-baf2-f881f587d037.png)<br>![Pasted image 20230427151801](https://user-images.githubusercontent.com/31990118/234784314-9d32b04c-8828-4ef2-b5cc-4f0924a2ff2a.png)
7. 데이터 추출하기.<br><script src="https://gist.github.com/MinGyu2/9d815c9e7f74b80823ac81c15d60aec8.js"></script><br>![Pasted image 20230427160531](https://user-images.githubusercontent.com/31990118/234785665-fe1ac79a-2812-4c9f-a2b8-709ec4eac7d8.png)

- 추출한 정보 확인<br>![Pasted image 20230427152642](https://user-images.githubusercontent.com/31990118/234787698-dd12b6ff-d729-4617-9be5-95f2ef87e07a.png)<br>![Pasted image 20230427161753](https://user-images.githubusercontent.com/31990118/234788225-fbe9d647-85ef-46c1-8d81-2535e4979f08.png)


### 참고사이트
---
- [sql - How do I limit the number of rows returned by an Oracle query after ordering? - Stack Overflow](https://stackoverflow.com/questions/470542/how-do-i-limit-the-number-of-rows-returned-by-an-oracle-query-after-ordering)
- [오라클 테이블 & 컬럼 조회 하는 방법 :: 인 생 (tistory.com)](https://jwklife.tistory.com/45)
- [Oracle DB (데이터 베이스) 정보 찾기 (tistory.com)](https://mymuseum.tistory.com/9)


