"""Data for the public-debt dashboard (debt.qmd and es/deuda.qmd), written to data/debt-dashboard.json.

For the 27 EU countries from 1995, the debt ratio and its annual change split into the primary balance,
the snowball effect (interest payments and nominal growth) and stock-flow adjustments, all in per cent
of GDP:

    change in debt = -primary balance + interest + growth effect + stock-flow adjustments
    growth effect  = -g / (1 + g) * debt ratio of the previous year, with g nominal GDP growth

Stock-flow adjustments close the identity, so the parts add up to the change exactly; they match the
AMECO series to 0.001 points at the median and to 0.21 at most (France, 2023). Also written: the
implicit interest rate (interest over the previous year's debt) and nominal growth.

The input is a country panel built from AMECO (May 2025 release) with these series in national
currency. Run from the project root:

    python3 _scripts/make_debt_data.py path/to/panel.csv
"""

import csv
import json
import sys
from pathlib import Path

PANEL = Path(sys.argv[1])
OUT = Path("data/debt-dashboard.json")
FIRST_YEAR = 1995
SOURCE = "AMECO, May 2025"

COUNTRIES = {
    "AUT": ("Austria", "Austria"), "BEL": ("Belgium", "Bélgica"), "BGR": ("Bulgaria", "Bulgaria"),
    "CYP": ("Cyprus", "Chipre"), "CZE": ("Czechia", "Chequia"), "DEU": ("Germany", "Alemania"),
    "DNK": ("Denmark", "Dinamarca"), "ESP": ("Spain", "España"), "EST": ("Estonia", "Estonia"),
    "FIN": ("Finland", "Finlandia"), "FRA": ("France", "Francia"), "GRC": ("Greece", "Grecia"),
    "HRV": ("Croatia", "Croacia"), "HUN": ("Hungary", "Hungría"), "IRL": ("Ireland", "Irlanda"),
    "ITA": ("Italy", "Italia"), "LTU": ("Lithuania", "Lituania"), "LUX": ("Luxembourg", "Luxemburgo"),
    "LVA": ("Latvia", "Letonia"), "MLT": ("Malta", "Malta"), "NLD": ("Netherlands", "Países Bajos"),
    "POL": ("Poland", "Polonia"), "PRT": ("Portugal", "Portugal"), "ROM": ("Romania", "Rumanía"),
    "SVK": ("Slovakia", "Eslovaquia"), "SVN": ("Slovenia", "Eslovenia"), "SWE": ("Sweden", "Suecia"),
}


def num(value):
    return None if value in ("", "NA", "NaN", None) else float(value)


def r2(value):
    return None if value is None else round(value, 2)


panel = {}
with PANEL.open(encoding="utf-8") as f:
    for row in csv.DictReader(f):
        panel.setdefault(row["country_code"], {})[int(row["year"])] = row
assert set(panel) == set(COUNTRIES), sorted(set(panel) ^ set(COUNTRIES))

countries, last_year, worst = [], FIRST_YEAR, 0.0
for code, (name_en, name_es) in COUNTRIES.items():
    rows = panel[code]
    years = [y for y in sorted(rows) if y >= FIRST_YEAR and num(rows[y]["debt_gdp"]) is not None]
    assert years == list(range(years[0], years[-1] + 1)), f"{code}: gap in the debt series"
    last_year = max(last_year, years[-1])
    s = {k: [] for k in ("debt", "change", "primary", "interest", "growth", "sfa", "rate", "nominal")}
    for y in years:
        r, prev = rows[y], rows.get(y - 1)
        debt = num(r["debt_gdp"])
        debt_prev = num(prev["debt_gdp"]) if prev else None
        pb, nl, g = num(r["primary_balance_gdp"]), num(r["net_lending_gdp_correct"]), num(r["g_nominal_nc"])
        s["debt"].append(r2(debt))
        if None in (debt_prev, pb, nl, g):
            for k in ("change", "primary", "interest", "growth", "sfa", "rate", "nominal"):
                s[k].append(None)
            continue
        interest = pb - nl
        growth = -(g / 100) / (1 + g / 100) * debt_prev
        change = debt - debt_prev
        sfa = change - (-pb + interest + growth)
        sfa_ameco = num(r["sfa_gdp_pct"])
        if sfa_ameco is not None:
            worst = max(worst, abs(sfa - sfa_ameco))
        s["change"].append(r2(change))
        s["primary"].append(r2(-pb))
        s["interest"].append(r2(interest))
        s["growth"].append(r2(growth))
        s["sfa"].append(r2(sfa))
        s["rate"].append(r2(num(r["r_eff_nc"])))
        s["nominal"].append(r2(g))
    countries.append({"code": code, "en": name_en, "es": name_es, "first": years[0], **s})

assert worst < 0.25, f"stock-flow adjustments differ from AMECO by {worst:.2f} points"
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps({"source": SOURCE, "first": FIRST_YEAR, "last": last_year, "countries": countries},
                          ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{OUT}: {len(countries)} countries, {FIRST_YEAR}-{last_year}; largest gap with AMECO's stock-flow series {worst:.2f}")
