# Přístupy ke znovupoužitelnosti komponent
Holahou, holahou, holahou přátelé. Jak lépe začít dokument o zbavování se repetitivnosti než právě 
opakováním se. :)

## DRY koncept
DRY je acronym pro 3 anglická slovíčka DONT REPEAT YOURSELF, tedy NEOPAKUJ SE. Což se lehce řekne, nicméně najít 
vhodnou abstrakci za kterou budeme shovávat obecné řešení je kolikrát složité. A proto zde máme návrhové vzory, které problém s vymýšlením abstrakce řeší za nás a my
 na ně jen našroubujem problém. Konkrétně bych chtěl vypíchnout 3 možnosti jak pomocí kompozice sdílet kód.
 
 ## DISCLAIMER
 Celý tento článek je založen na API bobrilu 9.6+. Neb v něm přichází bobril s podporou hooků, za pomoci kterých už 
 jsme schopni napsat většinu logiky. Pro plné pochopení doporučuji otevřít example projekt a konkrétní implementace 
 si vyzkoušet na vlasntí kůži.
 
## Render props
Implementace takovéhoto návrhového vzoru je jednoduchá, vytvoříme komponentu, která jako svá vstupní data nebude brát
 bobril nody, ale render funkci/funkce bobril nodu/ů, kterým bude do parametru injectovat své privátní hodnoty. Na konrétnímm 
 případě: Potřebujeme detekovat pozici kurzoru uvnitř elementu. Naivní implementace je poměrně přímočará.
 
```typescript
class NaiveCursorDetect extends b.Component<{}> {
    position: Position;

    constructor() {
        super();
        this.position = {
            x: 0,
            y: 0
        }
    }

    onMouseMove(event: b.IBobrilMouseEvent): b.GenericEventResult {
        const {x, y} = event;
        this.position = {
            x,
            y
        };
        b.invalidate(this);
        return b.EventResult.HandledPreventDefault;
    }

    render(data: {}): b.IBobrilChildren {
        return (
            <div style={{width: "500px", height: "500px", position: "relative"}}>
                {this.position.x}
                {this.position.y}
            </div>
        )
    }
}
```
Tím máme vytvořenou komponentu která je schopna renderovat pozici cursoru uvnitř sebe. Perfektní a validní 
řešení. Nyní uvažme scénář kdy uvnitř této komponenty chceme renderovat další komponenty, které na svém interfacu 
přijímají pozici na které se uvnitř svého parenta nacházejí. Easy peasy. Definujeme tedy nejdříve komponentu, která 
se dokáže pozicovat v rámci parenta.
````typescript
    export function ComponentOnPosition(data: Position, children: b.IBobrilChildren) {
        return (
            b.styledDiv(children, {
                position: "absolute",
                top: data.y,
                left: data.x
            })
        )
    }
````
Jednoduchá komponenta přijímající pozici jako svůj parametr. A teď upravíme render funkci obalovací komponenty
```typescript
    render(data: {}): b.IBobrilChildren {
            return (
               <div style={{width: "500px", height: "500px"}}>
                   <ComponentOnPosition x={this.position.x} y={this.position.y} >
                       Victim
                   </ComponentOnPosition>
                   <ComponentOnPosition x={this.position.x - 10} y={this.position.y - 10} >
                       Stalker
                   </ComponentOnPosition>
               </div>
            )
        }
```
A je to. Renderujeme oběť a stalkera na základě pozice cursoru. Naše skvělá komponenta běží týden a přijde za námi 
nadřízený s tím, že nemáme strašit malé děti a udělat stejnou verzi, která bude mít PEGI12. Oukej šéfe není problem, 
dovoluji si vám představit moje kamarády CtrlC a CtrlV :). A teď vážně, chceme tedy upravit render funkci tak 
aby zobrazovala Toma a Jerryho, na místo stalkera a oběti. Pokud ale upravíme původní render rozbijeme komponentu s 
PEGI12. 

## Render props jako záchrana 
Čeho tedy chceme dosáhnout? Mít dynamický obsah uvnitř renderovaného divu. A jak už víme dynamika = funkce. Upravme 
tedy komponentu tak aby přijímala funkci, která bude na její zavolání vracet nody a jako parametr 
bude přijímat to co je v této komponentě to hlavní, tedy pozici.
```typescript
export interface IData {
    render: (position: Position) => b.IBobrilChildren;
}

class DynamicCursorDetect extends b.Component<IData> {
    position: Position;

    constructor() {
        super();
        this.position = {
            x: 0,
            y: 0
        }
    }

    onMouseMove(event: b.IBobrilMouseEvent): b.GenericEventResult {
        const {x, y} = event;
        this.position = {
            x,
            y
        };
        b.invalidate(this);
        return b.EventResult.HandledPreventDefault;
    }

    render(data): b.IBobrilChildren {
        return (
            <div style={{width: "500px", height: "500px"}}>
                {data.render(this.position)}
            </div>
        )
    }
}
```
Použití této komponenty pak vypadá následovně
```typescript
<DynamicCursorDetectComponent render={position => (
    <>
        <ComponentOnPosition x={position.x} y={position.y}>
            Tom
        </ComponentOnPosition>
        <ComponentOnPosition x={position.x - 10} y={position.y - 10}>
            Jerry
        </ComponentOnPosition>
    </>
)}/>
```

## HOC alias High Order Component
Tento komponentový návrhový vzor je už lehce složitější na uchopení. Je založený na myšlence obalení komponenty jinou
 komponentou. 
 ```typescript
export function hocDetectCursor<T extends Position>(Component: b.IComponentFactory<T>): b.IComponentFactory<{}> {
    return b.component(class HocDetectInParent extends b.Component<{}> {
        render() {
            return (
                <HOC>
                    <Component/>
                </HOC>
            )
        }
    }
}
```
Jak je vidět z příkladu vystavujeme funkci, která přijímá původní komponentu jako parametr a vrací komponentu, která v
 renderu vykresluje původní komponentu. Obalovací komponenty jsou dále děleny na 2 typy a to injectory a enhancery, tedy komponenty, které dovnitř vnitřní 
 komponenty poskytují nějaká data navíc a komponenty rozšiřucící funcionalitu vnitřní komponenty. Pojďme se vrátit k 
 našemu prvnímu problému vykreslování komponenty na pozici cursoru. Chceme tedy vykreslovat komponentu na základě pozice cursoru uvnitř rodičovské 
 komponenty. Napíšeme tedy komponentu, která bude schopna toto řešit.
 
```typescript
export function hocDetectCursor<T extends Position>(TempComponent: b.IComponentFactory<T>): b.IComponentFactory<{}> {
    return b.component(class HocDetectInParent extends b.Component<{}> {
        position: Position;
        offset: OffsetInfo;

        constructor() {
            super();
            this.position = {
                x: 0,
                y: 0
            };
            this.offset = {
                x: 0,
                y: 0,
                maxX: 0,
                maxY: 0
            };
        }

        postInitDom(me: b.IBobrilCacheNode): void {
            const element = b.getDomNode(me) as HTMLElement;
            const bounding = element.getBoundingClientRect();
            this.offset = {
                x: bounding.left,
                y: bounding.top,
                maxX: bounding.width,
                maxY: bounding.height,
            };
            this.recalculatePosition(this.position.x, this.position.y);
        }

        onMouseMove(event: b.IBobrilMouseEvent): b.GenericEventResult {
            const {x, y} = event;
            this.recalculatePosition(x, y);
            return b.EventResult.HandledPreventDefault;
        }

        private recalculatePosition(x: number, y: number) {
            const {maxY, maxX, x: offsetX, y: offsetY} = this.offset;

            this.position = {
                x: normalizeCoords(maxX, x - offsetX),
                y : normalizeCoords(maxY, y - offsetY)
            };
            b.invalidate(this);
        }

        render(data) {
            const {x, y} = this.position;
            return (
                <div style={{width: "100%", height: "100%"}}>
                    <Component x={x} y={y}>
                        {data.children}
                    </Component>
                </div>
            )
        }
    })
}
```
Napsali jsme injectorHoc, který spočítá pozici componenty v parentu a následně ji injectuje dovniř obalované komponenty.

Druhý typ hoc component řeší lehce odlišné problémy. Konrétně doplnění/pozměnění funkcionality vnitřní komponenty, 
případně se může starat o transformaci dat z vstupních do HOC na výstupní do vnitřní komponenty.

```typescript
export function hocEnhancer<T>(TempComponent: b.IComponentFactory<T>): b.IComponentFactory<ComponentData<T>> {
    return b.component(class HocDetectInParent extends b.Component<ComponentData<T>> {
        loading: boolean;
        loadedData: T | null;

        constructor() {
            super();
            this.loading = true;
            this.loadedData = null;
        }

        init() {
            this.data.data.then((data) => this.dataLoaded(data))
        }

        dataLoaded(incomeData: T) {
            this.loading = false;
            this.loadedData = incomeData;
            b.invalidate(this);
        }
        render() {
            const Component = TempComponent as any;
            if (this.loading) {
                return <div>Loading...</div>
            }
            return (
                <Component {...this.loadedData}/>
            )
        }
    })
}
```
Na příkladu je právě jedna taková komponenta, která na vstupu bere Promise, po jejímž splnění dostaneme data 
generického typu, která očekává komponenta, kterou obalujeme. HOC componenta drží ve svém stavu informaci o tom zda 
již byla promisa resolvnutá a v případě že ano, renderuje komponentu, které posíla unwrapnutá data získaná z promisy. V
 případě, že na data stále čekáme, zobrazuje vysoce sofistikovaný loader. Vstupní data do HOC jsme tedy 
 transformovali na data, s kterými již vnitřní komponenta umí pracovat. Ta se následně může starat jen o to k čemu je 
 stvořena, tedy renderovat view na základě dat a neřešit asynchronnost v podobě promisy.
 
 ## Hooks
 
 ## DISLCLAIMER
 Bobril releasnul hooky teprve před pár dny. Vycházím ze zkušeností nasbíraných v reactu. Možná některé příklady 
 nejsou napsané ideálně. Kdokoliv by měl improvement prosím neváhejte nad pull requestem.
 
 ## Představení hooků
Zatím jsme si představili 2 návrhové vzory, které se svým přístupem liší a člověk musí často přemýšlet nad tím, který
 bude lepší použít. Co kdyby jsme měli jen jeden přístup, který pokryje všechny casy plnohodnotně? To zní dobře, ale 
 jak na to? Odpověď je HOOK. Pojďme si představit ty základní. 
 
 ## useState
 Chceme mít stav uvnitř funkionální komponenty, případně stav zafixovaný uvnitř render funkce bez nutnosti do toho zatahovat classu? Není problém.
```javascript 1.8
export const UseStateHook = b.component(() => {
  const [xPosition, setXPosition] = b.useState(0);
  const [yPosition, setYPosition] = b.useState(0);

  return (
    <div
      style={{ width: "300px", height: "300px", position: "relative" }}
      onMouseMove={event => {
        setXPosition(event.x);
        setYPosition(event.y);
      }}
    >
      <div style={{ position: "absolute", top: yPosition, left: xPosition }}>
        Rendered item
      </div>
    </div>
  )
});
```
V podstatě asi není nic moc co vysvětlovat. Bobril vyvoří v paměti 
místo, do kterého ukládá informace, které se vážou k render funkci této komponenty. V každém jejím dalším renderu jsou 
informace vzaté z tohoto stejného místa. Clean and easy.

## useEffect
Vycházejme z překladu, tedy "použij effect". Efektem myslíme side efekt. UseEffect je volán mimo výkon render funkce. 
Není o něm tedy možné přemýšlet synchronně. Slouží pro provádění side effektů týkajících se komponenty (volání API, 
bindění na browser eventy, subscribce). Bobril ještě přichází se synchronní verzí useEffectu pojmenovanou 
useLayoutEffect. S ní opatrně neb jelikož je synchronní dokáže zablokovat render thread. Tedy zaseknout uživatelské 
rozhraní, tím vyvolat nevoli na straně uživatele a to přeci nechceme :)

```typescript
export const UseEffect: b.component(() => {
  const [pressedKey, setPressedKey] = b.useState("");
  b.useEffect(() => {
    console.log("binding will happen");
    const handler = (event: KeyboardEvent) => setPressedKey(event.key);
    window.addEventListener("keypress", handler);
    return () => window.removeEventListener("keypress", handler);
  });

  return (
    <div>
      <div>Focus browser and start typing</div>
      {pressedKey}
    </div>
  )
});
```
Funkční řešení výpisu zmáčknuté klávesy. Jelikož bindíme event je dobrá zvyklost si po sobě také uklidit. K tomu slouží 
návratová hodnota funkce deklarované uvnitř useEffectu. Jak jsme již zkonstatovali, řešení je to funkční. Nicméně 
pokud otevřeme konzoli zjistíme, že se nám s každým voláním render funkce komponenty provádí deklarovaný 
efekt. Pokud efekt není nutné vykonávat s každým rendrem, můžeme useEffectu druhým parametrem říci jeho závislosti, 
na které ma brát zřetel při rozhodování zda bude efekt funkci vykonávat znovu. Pro náš případ je tedy seznam 
dependencí prázdný. Což znamená. Proveď jen a pouze při prvním renderu, pak už tě nemusí zajímat nic.

```typescript
export const UseEffect = b.component(() => {
  const [pressedKey, setPressedKey] = b.useState("");
  b.useEffect(() => {
    console.log("binding will happen");
    const handler = (event: KeyboardEvent) => setPressedKey(event.key);
    window.addEventListener("keypress", handler);
    return () => window.removeEventListener("keypress", handler);
  }, []);

  return (
    <div>
      <div>Focus browser and start typing</div>
      {pressedKey}
    </div>
  );
});
```
 Pokud se nyní koukneme do konzole tak ta je krásně čistá.

Teď ale něco zajímavějšího. Pojďme definovat další mód pro náš handler na window, ve kterém začneme místo zmáčklé 
klávesy vypisovat její kód. Mód budeme měnit za pomoci mezerníku. 
```typescript
export const UseEffectNotWorking = b.component(() => {
  const [pressedKey, setPressedKey] = b.useState("");
  const [codeMode, setCodeMode] = b.useState(false);
  b.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === " ") {
        setCodeMode(!codeMode);
      } else {
        setPressedKey(codeMode ? event.code : event.key);
      }
    };
    window.addEventListener("keypress", handler);
    return () => window.removeEventListener("keypress", handler);
  }, []);

  return (
    <div>
      {pressedKey}
    </div>
  )
});
```
Poučeni z minulých nezdarů rovnou přidáváme binding jen a pouze v případě prvního renderu. Ono to ale nefunguje. 
Odpověď na otázku proč to nefunguje najdeme v javascriptu samotném. Konrétně za to mohou closury. Deklarace efekt 
funkce probíhá v čase prvního renderu, kdy máme buňce pojmenované codeMode uloženou hodnotu false. Hodnota false je 
tedy dostupná z closury v každém dalším volání efektové funkce. Tedy ternární výraz uvnitř setPressedKey je pokaždé 
vyhodnocen negativně. Zalhali jsme totiž useEffectu ohledně jeho závislostí. Je totiž závislý právě na hodnotě 
codeMode. Přepíšeme tedy seznam závislostí.

```typescript
export const UseEffectNotWorking = b.component(() => {
  const [pressedKey, setPressedKey] = React.useState("");
  const [codeMode, setCodeMode] = React.useState(false);
  React.useEffect(
    () => {
      const handler = (event: KeyboardEvent) => {
        console.log("binding will happen");
        if (event.key === " ") {
          setCodeMode(!codeMode);
        } else {
          setPressedKey(codeMode ? event.code : event.key);
        }
      };
      window.addEventListener("keypress", handler);
      return () => window.removeEventListener("keypress", handler);
    },
    [codeMode]
  );

  return (
    <div>
      <div>Focus browser and start typing</div>
      {pressedKey}
    </div>
  );
});
```
Vualá a vše funguje jak má. Když zkusíme zmáčknout mezerník 
zjistíme, že funkce uvnitř effektu proběhla znovu, tedy došlo k přebindování funkce a tato nová funkce má už korektní 
hodnotu ve své closure.

## Znovupoužitelnost s pomocí hooků
Tak a teď to hlavní proč je okolo hooku v komunitě react vývojářů takové haló. Bobril, stejně jako react nám
 umožňuje definovat vlastní hooky, ve kterém můžeme dle libosti kombinovat vystavované hookAPI a takto vytvářet 
 znovupoužitelnou logiku. Ta je snadná na použití, v komponentové struktuře nevytváří indirekci a je relativně 
 snadná na pochopení. Pojďme tedy napsat logiku pro počítání komponenty na souřadnicích za pomoci custom hooku. Dle konvence 
use + co chceme dělat ho pojmenujeme useCursorCoordinates.
```typescript
function useCursorCoordinates(ref?: HTMLElement) {
    const [positionX, setPositionX] = b.useState(0);
    const [positionY, setPositionY] = b.useState(0);
    const [offsetX, setOffsetX] = b.useState(0);
    const [offsetY, setOffsetY] = b.useState(0);

    b.useLayoutEffect(() => {
        if (ref) {
            const bounding = ref.getBoundingClientRect();
            setOffsetX(bounding.left);
            setOffsetY(bounding.top);
        }
    }, [ref]);

    b.useEffect(
        () => {
            const handler = (event: MouseEvent) => {
                setPositionX(event.clientX - offsetX);
                setPositionY(event.clientY - offsetY);
            };
            if (ref) {
                ref.addEventListener("mousemove", handler, true);
                return () => ref.removeEventListener("mousemove", handler);
            }
            return null;
        },
        [ref, offsetX, offsetY]
    );

    return [positionX, positionY];
}
```
Jako vstupní parametr do našeho hooku jde ref, což reference na DOM element v nemž chceme detekovat pozici kurzoru. Na této referenci nám záleží 
 uvnitř efekt funce, uvádíme ji tedy jako její závislost, dále jako dependency uvádíme offset pro x a y souřadnici. V 
 neposlední řadě po sobě nezapomeneme uklidit. Tím máme hook definovaný a můžeme ho používat v aplikaci. Ještě jedna 
 tricky záležitost a to je bind eventu na konkrétní element. Je potřeba event řešit už v capturing fázi (poslední 
 boolean flag), jinak k nám event ani nedobublá, jelikož bude zastaven bobrilem.
  
Jediné co budeme potřebovat pro inicializaci hooku je ref pojďme ho tedy získat a vyrenderovat div na pozici: 
 ```typescript
export const CustomHook = b.component(class CustomHookClazz extends b.Component<{}> {
    element?: HTMLElement;
    postInitDom(me: b.IBobrilCacheNode): void {
        this.element = b.getDomNode(me) as HTMLElement;
    }

    render(data: {}): b.IBobrilChildren {
        const [x, y] = useCursorCoordinates(this.element);

        return (
            <div style={WrapperStyles}>
                <ComponentOnPosition x={x} y={y}>
                    Wow i am using hook
                </ComponentOnPosition>
            </div>
        )
    }
});
```
 
Bobril narozdíl od reactu umožňuje využití hooků v class komponentách. Což je zajímavé a class pojetí nám umožní 
úplně vynechat hook pojmenovaný useRef. Ten se používá pro vytvoření mutable přepravky, která bude dostupná v každém 
volání render funkce. V našem případě jako mutable přepravku použijeme this classy. V istanci classy si ukládáme DOM element, který dostáváme v lifecycle metodě postInitDom.
a následně ho předáme našemu custom hooku.

Jednoduchý zápis, jednoduchá znovupoužitelnost na základě zavolání funkce. 
 
 ## Závěr
 S možnostmi jež nám poskytuje bobril je ale nutné zacházet opatrně a jasně definovat oblasti, ve kterých chceme 
 používat který přístup. Dovedu si dost dobře představit, že neopatrným mixováním hooků s class pojetím definice 
 komponenty zaneseme do kódu nadbytečnou logiku, která v konečném důsledku bude těžko uchopitelná a bude bránit 
 čitelnosti kódu.
 
 A tím jsme se dostali až na konec. Čtenářům děkuji a tě píc.