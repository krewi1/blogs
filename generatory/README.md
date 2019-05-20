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