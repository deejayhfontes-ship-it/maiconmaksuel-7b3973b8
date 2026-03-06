import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Delete } from "lucide-react";

type BtnType = "number" | "op" | "equal" | "clear" | "del" | "fn";

interface CalcButton {
    label: string;
    value: string;
    type: BtnType;
    span?: number;
}

const BUTTONS: CalcButton[] = [
    { label: "AC", value: "AC", type: "clear" },
    { label: "±", value: "±", type: "fn" },
    { label: "%", value: "%", type: "fn" },
    { label: "÷", value: "/", type: "op" },

    { label: "7", value: "7", type: "number" },
    { label: "8", value: "8", type: "number" },
    { label: "9", value: "9", type: "number" },
    { label: "×", value: "*", type: "op" },

    { label: "4", value: "4", type: "number" },
    { label: "5", value: "5", type: "number" },
    { label: "6", value: "6", type: "number" },
    { label: "−", value: "-", type: "op" },

    { label: "1", value: "1", type: "number" },
    { label: "2", value: "2", type: "number" },
    { label: "3", value: "3", type: "number" },
    { label: "+", value: "+", type: "op" },

    { label: "0", value: "0", type: "number", span: 2 },
    { label: ".", value: ".", type: "number" },
    { label: "=", value: "=", type: "equal" },
];

const formatDisplay = (val: string) => {
    if (val.length > 12) return parseFloat(val).toExponential(4);
    return val;
};

const Calculadora = () => {
    const [display, setDisplay] = useState("0");
    const [expression, setExpression] = useState("");
    const [justCalc, setJustCalc] = useState(false);

    const handleButton = (btn: CalcButton) => {
        if (btn.type === "clear") {
            setDisplay("0");
            setExpression("");
            setJustCalc(false);
            return;
        }

        if (btn.value === "DEL") {
            setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
            return;
        }

        if (btn.value === "±") {
            setDisplay(prev => prev.startsWith("-") ? prev.slice(1) : "-" + prev);
            return;
        }

        if (btn.value === "%") {
            try {
                const val = parseFloat(display) / 100;
                setDisplay(String(val));
            } catch { /* ignore */ }
            return;
        }

        if (btn.type === "equal") {
            try {
                const expr = expression + display;
                const result = Function(`"use strict"; return (${expr})`)();
                const resultStr = Number(result.toFixed(10)).toString();
                setExpression("");
                setDisplay(resultStr);
                setJustCalc(true);
            } catch {
                setDisplay("Erro");
                setExpression("");
            }
            return;
        }

        if (btn.type === "op") {
            setExpression(expression + display + btn.value);
            setDisplay("0");
            setJustCalc(false);
            return;
        }

        // Dígito/ponto
        if (justCalc) {
            setDisplay(btn.value === "." ? "0." : btn.value);
            setExpression("");
            setJustCalc(false);
            return;
        }

        if (btn.value === "." && display.includes(".")) return;
        setDisplay(prev => prev === "0" ? (btn.value === "." ? "0." : btn.value) : prev + btn.value);
    };

    const btnClass = (btn: CalcButton) => {
        const base = "flex items-center justify-center rounded-2xl text-base font-semibold transition-all active:scale-95 select-none cursor-pointer";
        const span = btn.span === 2 ? "col-span-2" : "";
        if (btn.type === "equal") return `${base} ${span} bg-blue-500 hover:bg-blue-400 text-white shadow-md`;
        if (btn.type === "op") return `${base} ${span} bg-amber-500 hover:bg-amber-400 text-white`;
        if (btn.type === "clear") return `${base} ${span} bg-red-100 hover:bg-red-200 text-red-600`;
        if (btn.type === "fn") return `${base} ${span} bg-slate-200 hover:bg-slate-300 text-slate-700`;
        return `${base} ${span} bg-white hover:bg-slate-50 text-slate-800 border border-slate-100 shadow-sm`;
    };

    const exprDisplay = expression
        .replace(/\*/g, "×")
        .replace(/\//g, "÷")
        .replace(/-/g, "−");

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-500" />
                    Calculadora
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                {/* Display */}
                <div className="bg-slate-900 rounded-2xl p-4 text-right min-h-[80px] flex flex-col justify-end">
                    <p className="text-slate-500 text-xs font-mono h-4 truncate">{exprDisplay || " "}</p>
                    <p className="text-white text-3xl font-bold font-mono tabular-nums truncate leading-tight mt-1">
                        {formatDisplay(display)}
                    </p>
                </div>

                {/* Grid de botões */}
                <div className="grid grid-cols-4 gap-1.5 flex-1">
                    {BUTTONS.map(btn => (
                        <button
                            key={btn.label}
                            onClick={() => handleButton(btn)}
                            className={`${btnClass(btn)} h-10${btn.span === 2 ? " col-span-2" : ""}`}
                        >
                            {btn.label === "DEL" ? <Delete className="w-4 h-4" /> : btn.label}
                        </button>
                    ))}
                </div>

                {/* Limpa result */}
                <button
                    onClick={() => { setDisplay("0"); setExpression(""); setJustCalc(false); }}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors text-center"
                >
                    Limpar tudo
                </button>
            </CardContent>
        </Card>
    );
};

export default Calculadora;
