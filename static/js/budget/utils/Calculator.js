// utils/Calculator.js
export class BudgetCalculator {
    static calculateItemValues(quantity, value, taxValue) {
        const safeQuantity = parseFloat(quantity) || 0;
        const safeValue = parseFloat(value) || 0;
        const safeTaxValue = parseFloat(taxValue) || 0;

        return {
            itemValue: safeQuantity * safeValue,
            itemTaxValue: safeQuantity * safeTaxValue,
            itemTotal: safeQuantity * (safeValue + safeTaxValue)
        };
    }

    static calculateBudgetTotals(rows) {
        return Array.from(rows).reduce((totals, row) => {
            const quantity = parseFloat(row.querySelector('input[name$="-quantity"]')?.value) || 0;
            const value = parseFloat(row.querySelector('input[name$="-value"]')?.value) || 0;
            const taxValue = parseFloat(row.querySelector('input[name$="-tax_value"]')?.value) || 0;

            totals.value += quantity * value;
            totals.taxValue += quantity * taxValue;
            totals.valueTotal += quantity * (value + taxValue);

            return totals;
        }, { value: 0, taxValue: 0, valueTotal: 0 });
    }
}