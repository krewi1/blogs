# Context
Architektura aplikace využívající komponenty je poměrně přímočará. V horních vrstách komponentové struktury chceme udržovat stav,
 který bude následně zobrazován za pomoci bezstavových, znovupoužitelných komponent. Do těch pouze posíláme data které chceme nechat zobrazit.
Příklad komponenty která bude zobrazovat textový obsah:
```typescript
interface IStyleData {
    color: string;
    padding: string;
}

interface ISentenceData {
    children: string;
    style: IStyleData;
}

export function Sentence(data: ISentenceData) {
    return <div style={data.style}>{data.children}</div>;
}
```
Komponenta přijímá textový obsah a zároveň styl, kterým bude tento obsah zobrazovat. Vycházíme-li ze situace, že pokud
 možno veškerý aplikační stav chceme udržovat na nejvrchnější úrovni a Sentence komponenta je list celého komponentového stromu, pak to pro nás v současném stavu znamená, že 
informace o stavu budeme posílat skrz všechny komponenty proto, aby se nakonec dostali až na list, kde budou následně
 použité. Představme si aplikaci, která bude mít tuto komponentovou strukturu:
Aplikace(stav) => Section => Paragraph => Sentence. Stav stylů bude tedy muset bublat skrz Sekci a Paragraf, aby se dostal až na Sentence komponetu.
Jak tedy zajistit to aby jsme informaci nemuseli předávat takto a zároveň zůstala definovaná na aplikační ůrovni? Definovováním kontextu. Context byl v bobrilu označován 
dřív jako cfg. V posledních patchích se bobril ale přiklání k terminologii zavedené Reactem. Tedy k označení Context
(kontext)

## Implementace kontextu
Pojďme definovat kontext:
```typescript
export const StyleContext = b.createContext({
    color: "red",
    padding: "5x",
});
```
A context použijeme
```typescript
function Sentence(this: b.IBobrilCtx, data: ISentenceData) {
    const style = b.useContext(StyleContext);

    return <div style={style}>{data.children}</div>;
}
```
Jednoduché a prosté. Definujeme StyleContext a tuto globálně definovanou hodnotu za pomoci hooku useContext dostaneme. Nyní si představme scénář,
ve kterém máme Paragrafů definovaných více a Sentence komponenty v každém Paragrafu chceme stylovat jiným způsobem. 
První řešení, co každého jistě napadne je definice dalšího kontextu skrze nové volání createContext. To by šlo, ale 
tímto by jsme do aplikace zanášeli redundantní kontextové definice. Pojďme to tedy zkusit z jiného úhlu a na 
vytvořený kontext srkze createContext koukat pouze jako na nadefinovaný kontrakt, který bude naplněn komponentou v komponentové struktuře. To se těžko představuje, tak si to pojďme raději ukázat na příkladu.
Kontrakt již máme definovaný v StyleContext. Nyní tento kontrakt poďme naplnit.
```typescript
function ParagraphWithYellowStyleContext(this: b.IBobrilCtx) {
    b.useProvideContext(StyleContext, { //poskutujeme kontextové hodnoty pro StyleContext kontrakt
        color: "yellow",
        padding: "5px"
    });
    return (
        <div>
            <Sentence>
                I am styled with context
            </Sentence>
        </div>
    )
}
```
Na úrovni renderu komponenty poskytneme context všem potomkům skrze funkci useProvideContext. Sentence tedy v tomto 
případě dostane kontextovou informaci, že se má renderovat žlutě.
Ukázka více přetížení: 
```typescript
function Section() {
    return (
        <div>
            <Paragraph/> // paragraph with default context 
            <ParagraphWithYellowStyleContext/>
            <ParagraphWithBlueStyleContext/>
        </div>
    )
}
```

## Improvements
Vše funguje jak má a my jsme úspěšně obešli předávání dat skrze data komponent. Co se mě osobně ale nelíbí, je vytržení 
kontextového providera z deklarace komponentové struktury do funčního volání. Pro vyřešní tohoto problému navrhuji 
jednoduchou obalovací komponentu definovanou například ve stejném modulu jako definujeme context skrze volání 
createContext.

Nejdříve extrahuji kontrakt definovaný createContextem do interfacu a následně definuji komponentu, která bude přijímat objekt splňující tento interface v datech. Dále bude v datech přijímat
children propertu. Tedy bude podporovat komponentovou kompozici.
```typescript
interface IStyleContext {
    color: string;
    padding: string;
}

export interface IStyleData {
    value: IStyleContext;
    children: b.IBobrilNode;
}

export function StyleProvider(data: IStyleData) {
    b.useProvideContext(StyleContext, data.value);

    return (
        <>
            {data.children}
        </>
    )
}
```
A definice komponent pak bude vypadat následovně
```typescript
function Section() {
    return (
        <div>
            <Paragraph/> // paragraph with default context
            <StyleProvider value={{color: "yellow", padding: "5px"}}>
                <Paragraph/>
            </StyleProvider>
            <StyleProvider value={{color: "blue", padding: "3px"}}>
                <Paragraph/>
            </StyleProvider>
        </div>
    )
}
```

V případě konzumu by jsme stejně tak mohli volání funkce useContext zabalit do komponenty, ale to mi naopak přijde jako nadbytečná definice zjevného.
Nicméně pro úplnost a hlavně pro, v podstatě 1:1 podobu s reactem si pojďme ukázat i obalovací komponentu pro Consume
 kontextu.
```typescript
export interface IConsumerData {
    render: (context: IStyleContext) => b.IBobrilNode;
}

export function StyleConsumer(data: IConsumerData) {
    const context = b.useContext(StyleContext);
    return data.render(context);
}
```
Konzumer je komponenta vuyžívající návrhový vzor render props představovaný v blogu o sdílení logiky. Její použití vypadá následovně.
```typescript
function Sentence(this: b.IBobrilCtx, data: ISentenceData) {
    return (
        <StyleConsumer>
            { style => <div style={style}>{data.children}</div> }
        </StyleConsumer>
    );
}
```

## Dynamický kontext
Jako další si pojďme představit možnosti jak měnit hodnotu v kontextu a zapříčinit tím rerender komponent proto, aby zareagovali na tuto změnu.
Jak řekneme bobrilu aby přerenderoval komponenty? Pokud se omezíme čistě na bobril pak explicitním zavolánim invalidate funkce. Pojďme tedy upravit kontrakt kontextu tak aby počítal se změnou.
```typescript
interface IStyleContext {
    color: string;
    changeColor: (color: string) => void,
    padding: string;
}
```
A nyní ještě potřebujeme zajistit volání invalidatu při zavolání changeColor. Nejjednodušší možností jak toto provést je definice stavové komponenty, která hodnotu kontextu bude udržovat jako svůj stav, tedy:
```typescript
class StyleContextProvider extends b.Component {
    color = "yellow";
    padding = "5px";
    
    changeColor = (color: string) => {
        this.color = color;
        b.invalidate(this);
    };
    
    render() {
        return (
            <StyleProvider value={{
                color: this.color,
                padding: this.padding,
                changeColor: this.changeColor
            }}>
                <Paragraph/>
            </StyleProvider>
        )
    }
}
```

A nyní múžeme z komponentového listu měnit skrze kontext stav aplikace:
```typescript
function Sentence(this: b.IBobrilCtx, data: ISentenceData) {
    const style = b.useContext(StyleContext);
    return (
        <div>
            <div style={{style}}>
                I am styled with context
            </div>
            <button onClick={() => style.changeColor(["red", "purple", "yellow", "green", "brown"][Math.floor(Math.random() * 5)])}>change color</button>
        </div>
    );
}
```

## První zmínky o bobxu
Existuje i poměrně jednodušší řešení celého problému a to s využitím knihovny bobx. O tom ale zase někdy příště. Tě pííc.