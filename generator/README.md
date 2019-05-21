# Generátory a iterátory
Dneska to bude trochu z jiného soudku, protože opustíme ryze frontendovou doménu a podívám se na iterátory a 
generátory v ES. Frontendovou problematiku se do toho ale budu snažit zakomponovat, tak uvidíme co z toho nakonec 
vyleze. Teď už s chutí do toho.

## DISLAIMER
Generátory josu novinka i pro mě a tenhle článeček bude můj prostor jak je lépe pochopit a zároveň aby to učení 
nepadlo vniveč to někde sepsat.

## Iterátory
### Co je iterátor?
Iterátor je obecný koncept implementovaný ve většine programovacích jazyků a slouží k procházení prvků bez znalosti 
jejich konkrétní implementace. Po získání iterátoru z datové struktury procházíme prvky za pomoci volání getNext/next
 metody.
 
Do javascriptu přibyly iterátory ve specifikaci es2015, tedy v es6. Podpora ze strany browserů tedy vypadá přívětivě, 
bohužel ne v IEčku, ale pro teď si odpustíme o iečku vůbec přemýšlet. Poslední věc co je potřeba zmínit je rozdíl 
mezi iterable objektem a iterátorem. Iterable objekt je objekt z něhož lze získat iterátor. A iterátor je objekt 
sloužící k iterování nad objektem.

### Kód
```typescript
const test = ["a", "b", "c"];
const it = test[Symbol.iterator]();
console.log(it.next()); // output: {value: "a", done: "false"}
```
Jak je vidět z příkladu každé volání metody next na iterátoru vrací objekt, mající na sobě property value a done. 
Value obsahuje hodnoty položky a done informaci o tom jestli jsme již na konci. Celé pole pak můžeme iterovat while 
cyklem 
```typescript
let {value, done} = gen.next(); // first item
while(!done) {
    console.log(value);
    ({value, done} = gen.next());
}
```
Pakliže má objekt, pak o něm můžeme říct, že je iterovatelný. Toho pak lze
 využít a iterovatelné objekty pak procházet skrze for...of cyklus. For...of cyklus je ale jen jedna z mnoha featur 
 ecmascriptu které pracuje s iterable objekty. Konkrétně iterable objekty můžeme využít pro: Array.from(), Spread,
 operator (...), Constructors of Maps and Sets, Promise.all(), Promise.race()
 ```typescript
const copy = [...test];
```
musí být zajištěna podmínka, že test je iterable objekt.
 ```typescript
for (let item of test) {
  console.log(item);
}
```
U objektů, u kterých by člověk očekával že se bude iterovat nám javascript podává pomocnou ruku a nabízí build in 
iterátory. Jak je konec konců vidět na příkladu, kde jsme použili vestavěný iterátor na poli. Vestavěný iterátor je 
možné najít na: String, Array, TypedArray, Map a Set typech. Na instanci konkétního typu je k dostání skrze Symbol
.iterator.

Teď, ale k něčemu zajímavějšímu a to k definování vlastního iterátoru. Řekněme, že píšeme aplikaci v které chceme 
udržovat mužská a ženská jména. Máme tedy toto
```typescript
const names = {
     men: [
         "MenName1",
         "MenName2",
     ],
     women: [
         "WomenName1",
         "WomenName2",
     ]
 }
```
Dalším požadavkem je výpis všech jmen nehledě na pohlaví. Možným řešením je definice iterátoru.
```typescript
const names = {
     ...
     [Symbol.iterator]: function iter() {
       const flatten = [...this.men, ...this.women];
       let index = 0;
       const iterator = {
           next: function() {
                          return {
                              done: index >= flatten.length,
                              value: flatten[index++]
                          }
                      }
       };
       return iterator;
     }
}
```
Po tom co takto definujeme iterátor můžeme plně využívat výhody s tím spojené.
```typescript
console.log(...names);
new Set(names);
Array.from(names);
for (let name of names) {
  console.log(item);
}
```
Aby jsem mohl téma iterátorů uzavřít. Je nutné pokrýt ještě nepovinné funkce iterátoru, kterými jsou return a throw. 
Return slouží k uklizení v případě, že iterace byla ukončena před jejím dokončením. Např:
```typescript
const iterator = {
    next() {
          return {
              done: index >= flatten.length,
              value: flatten[index++]
          }
      },
      return() {
        console.warn("not all names included");
      }
    };

for (let name of names) {
  console.log(name);
  break;
}
```
Jelikož jsme for...of loop ukončili předčasně je zavolaná return metoda iterátoru. Dalšími možnostmi jak docílit 
zavolání return funkce jsou předčasné zavolání return a throw.

## Generátory
Se znalostí iterátorů můžeme volně přjít ke generátorům. Generátory, stejně jako iterátory implementují iterátor 
protokol. Takže od generátoru můžeme očekávat funkce next, throw, return. Pro konstrukci generátoru použijeme * za 
klíčovým slovem function a to ať už hned za, případně před jménem funkce, tedy:
```typescript
 function* createGen(){}
 function *createGen(){}
```
jsou synonyma. A jak to tak už bývá, co člověk to jiný názor na to který zápis je správný. Takže moje rada vybrat 
jeden způsob a pak už jen držet konvenci. Bylo řečeno, že generátor implementuje iterable protokol. Pro vrácení 
hodnoty po zavolání next funkce slouží nové klíčové slovo yield. K čemu je ale takový generátor dobrý a proč vznikl? 
Za pomici generátoru můžeme pozastavit výkon funkce až do dalšího zavolání next funkce. Pozastavení výkonu se děje 
právě na klíčovém slově yield. Na jednoduchém příkladě generátoru identifikátorů.
```typescript
function *idGenerator() {
    let id = 0;
    while(true) {
        // yield value and stop until next call of next;
        yield id++;
    }
}
const generateId = idGenerator();
// find first yield and get its value
console.log(generateId.next()); // {value: 0, done: false}
// next yield
console.log(generateId.next()); // {value: 1, done: false}
// next yield
console.log(generateId.next()); // {value: 2, done: false}
// next yield
console.log(generateId.next()); // {value: 3, done: false}
```
Jak bylo zmíněno generátor implementuje iterable protokol. Takže na zavoláni next funkce se nám vrací objekt, jež 
kromě hodnoty samotné vrací i informaci o tom, jestli je generátor hotový s generováním hodnot. To na tomhle příkladě
 nikdy nenastane tak ho upravíme.
 ```typescript
function *idGeneratorLimited() {
    let id = 0;
    while(id < 2) {
        // yield value and stop until next call of next;
        yield id++;
    }
}
const generateId = idGeneratorLimited();
// find first yield and get its value
console.log(generateId.next()); // {value: 0, done: false}
console.log(generateId.next()); // {value: 1, done: false}
console.log(generateId.next()); // {value: undefined, done: true}
console.log(generateId.next()); // {value: undefined, done: true}
```
3. volání funkce next vrací informaci o tom, že generátor už má práci hotovou. Díky iterable protokolu lze dostat 
všechny id najednou pomocí:
```typescript
console.log([...generateId]); // 0 1

// or just iterate
for (let id of generateId) {
    console.log(id); // 0 => 1
}
```
Generátory lze kombinovat a delegovat výkon na další generátor
```typescript
function *idGeneratorString() {
    let id = ["a", "b"];
    let index = 0;
    while(index < id.length) {
        // yield value and stop until next call of next;
        yield id[index];
    }
}

function *combinedGenerator() {
    yield* idGeneratorLimited();
    yield* idGeneratorString();
}
const comb = combinedGenerator();
console.log(...comb); // 0 1 "a" "b"
```
A máme posloupnost id generovanou 2 různýma generátorama. Jelikož i generátory i iterátory implementují setjný 
protokol můžeme je i kombinovat. S touhle znalostí můžeme upravit původní example s mužskými a ženskými jmény.
```typescript
const names = {
     ...
     *[Symbol.iterator]() {
       const flatten = [...this.men, ...this.women];
       yield* flatten;
     }
}
```
Iterátor deklarovaný generátorem deleguje svůj výkon build-in iterátoru pole. 

Co je důležité ještě říct a zatím nebylo zmíněno tak to že generátory jsou obousměrné. To znamená, že kromě toho že 
mohou yieldovat hodnoty ven, tak srkze parametr next hodnoty mohou přijímat hodnoty. Toho lze využít na řadě míst. 
Doporučuji se kouknout třeba na libku co.js. Ještě před tím než byla oznámena async/await syntaxe co.js za pomoci 
generátoru nabízela stejný synchronně vypadající zápis. Teď už ale ke konkrétnímu použití. Popovídáme si s window.
```typescript
function *talk() {
  yield {type: "alert", question: "Ahoj"};
  const firstName = yield {type: "prompt", question: "Jak je tve krestni jmeno?"};
  const lastName = yield {type: "prompt", question: "Příjmení?"};
  return {type: "alert", question: `Těší mě ${firstName} ${lastName}`};
}
const generator = talk();
let item = generator.next();
while(!item.done) {
    const val = window[item.value.type](item.value.question);
    item = generator.next(val);
}
window[item.value.type](item.value.question);
```
Talk generátor vrací v každém kroku objekt ve kterém propertou type říká, jestli očekává response a question 
propertou co chce zobrazovat za zprávu. Dostaneme iterátor zavoláním generátoru a iterujeme dokud nejsme na konci. A 
nakonec zobrazíme poskládané informace.

Pro zkompletování si ještě vyzkouším throw a return na iterátoru. Prnví throw:
```typescript
    function *throwing() {
      yield;
      throw "error";
      yield;
    }
    const throwOutside = throwing();
    
    try {
      console.log(throwOutside.throw("Ooops")); //nothing
    } catch (e) {
      console.log("throwed outside", e);
    }
    console.log(throwOutside.next()); // {value: undefined, done: true}
    
    const throwInside = throwing();
    try {
      console.log(throwInside.next());
      console.log(throwInside.next()); //nothing
    } catch (e) {
      console.log("throwed inside" ,e);
    }
    console.log(throwInside.next()); // {value: undefined, done: true}
```
Generátor je definovaný tak, že má 3 zastávky.Jak je ale vidět už z definice ke 3. zastávce se nikdy nedostane. Error
 stavu lze dosáhnout 2. způsoby. Buď explicitním zavoláním throw na iterátoru. Nebo pokud bude error vyvolaný uvnitř 
 generátoru. 
 
 A v neposlední řadě ještě explicitní ukončení iterátoru za pomoci volání return funkce.
 ```typescript
const returning = throwing();
console.log(returning.return("ahoj")); // {value: "ahoj", done: true}
```

Nakonec ještě jedna hříčka a to implementace nonblocking pipe funkce. 
## Disslaimer
Čiste moje řešení. Nápadům a názorům jsem otevřen.

Teď už ale k implementaci. Budeme psát asynchronní api takže navenek vrátíme 
promise a api bude vypadat takto:
 ```typescript
const valPromise = nonBlockEvaluate(pipe(multiplyByThree, addTwo))(3);

const intervalid = setInterval(
  () => console.log("not blocking", new Date().getTime()),
  300
);
valPromise.then(result => {
  console.log("result: ", result);
  clearInterval(intervalid);
});
```
Zároveň v intervalu budeme checkovat, že api neblockuje thread. Nejdříve generator pro funkce do v pipeline
```typescript
function genPipe(...fncs) {
	return function* fncGenerator() {
		yield* fncs.map(fnc => val =>
			new Promise(resolve => setTimeout(() => resolve(fnc(val)), 1000))
		);
	};
}
```
Děje se tady toho hodně.. Tak si to shrneme. Funkce genPipe přijíma n funkcí jako parametr a zajistí asynchronicitu 
výkonu pomocí setTimeoutu. Jelikož dochází k resolvu v průběhu času zároveň mapujeme originální funkci na Promise a 
nakonec z toho vytvoříme generátor, který bude yieldovat právě ony promisy. 

Máme generátor a ještě potřebujeme funkci která s tímto generátorem bude umět pracovat
```typescript
function nonBlockEvaluate(genDef) {
	return function evaluate(val) {
		return new Promise(function prom(resolve) {
			const gen = genDef();
			function iterate(value) {
				let item = gen.next();
				if (item.done) {
					resolve(value);
				} else {
					item.value(value).then(val => iterate(val));
				}
				console.log("iteration done in: ", new Date().getTime());
			}
			iterate(val);
		});
	};
}
```
Funkce přijímá generátor jako parametr a vrací funkci, kkterá přijíma vstupní hodnotu do pipeliny. Tenhle zápis je 
ekvivalentní s 
```typescript
function nonBlockEvaluate(genDef, val) {
	return new Promise(function prom(resolve) {
		const gen = genDef();
		function iterate(value) {
			let item = gen.next();
			if (item.done) {
				resolve(value);
			} else {
				item.value(value).then(val => iterate(val));
			}
			console.log("iteration done in: ", new Date().getTime());
		}
		iterate(val);
	});
}
```
ale pro větší podobnost s funkcionálními knihovnami jsem použil první zmíněný. Jak api naznačuje vracíme promise. 
Uvnitř promisu se děje skutečná práce. Definujeme funkci iterate, která v každém kroku vezme položku z generátoru a v
 případě, že iterátor ještě nebyl ukončen počká, až se resolve vrácený promise. V případě, že je iterátor hotový 
 resolvuje navrácený promise.