import { addDays, format } from 'date-fns';

const DAYS_PER_QUINQUENIO = 1825;

export class AtsModel {
    constructor() {
        this.appData = [];
        this.mainUA = '';
        this.deductions = {}; // { "cpf_di": { 2015: 10, ... } } Em Memória!
    }

    // Processa os dados brutos do CSV PapaParse
    processCSVData(data) {
        this.appData = data.filter(row => row.Nome && row.CPF).map(row => ({
            ua: row['Unidade Administrativa'] || '',
            cpf: row['CPF'] || '',
            di: row['DI'] || '1',
            nome: row['Nome'] || '',
            qt: row['Qt'] || '0',
            ultima: row['Data da última concessão'] || '-',
            setPrevista: row['Data prevista para próxima concessão'] || row['Data Prevista de Concessão'] || '-'
        }));

        const uaCounts = {};
        this.appData.forEach(r => {
            uaCounts[r.ua] = (uaCounts[r.ua] || 0) + 1;
        });
        this.mainUA = Object.keys(uaCounts).reduce((a, b) => uaCounts[a] > uaCounts[b] ? a : b, '');
    }

    // Gerenciador de Descontos Temporários
    getDeductions(cpf, di) {
        const key = `${cpf}_${di}`;
        return this.deductions[key] || {};
    }

    saveDeduction(cpf, di, year, days) {
        const key = `${cpf}_${di}`;
        if (!this.deductions[key]) this.deductions[key] = {};
        this.deductions[key][year] = days;
    }

    getTotalDeductions(cpf, di) {
        const userDeductions = this.getDeductions(cpf, di);
        return Object.values(userDeductions).reduce((sum, val) => sum + (Number(val) || 0), 0);
    }

    // Lógica Legislativa do Descongelamento SP (Assume Descongelado p/ nova regra)
    calculateNextATSDate(lastConcessionDateStr, totalDeductions = 0) {
        if (!lastConcessionDateStr || lastConcessionDateStr === '-') return null;
        const [day, month, year] = lastConcessionDateStr.split('/').map(Number);
        let date = new Date(year, month - 1, day);
        return addDays(date, DAYS_PER_QUINQUENIO + totalDeductions);
    }

    // Processamento do XML da SED
    importFromXML(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const logs = xmlDoc.getElementsByTagName("LogCalculo");
        let importedCount = 0;

        for (let log of logs) {
            const cpf = log.getElementsByTagName("CPF")[0]?.textContent;
            const di = log.getElementsByTagName("DI")[0]?.textContent || "1";
            
            if (!cpf) continue;

            const faltas = log.getElementsByTagName("FaltaCalculo");
            const yearlySums = {};

            for (let falta of faltas) {
                const inicio = falta.getElementsByTagName("Inicio")[0]?.textContent;
                const dias = parseInt(falta.getElementsByTagName("Dias")[0]?.textContent || "0");
                
                if (inicio) {
                    const year = new Date(inicio).getFullYear();
                    yearlySums[year] = (yearlySums[year] || 0) + dias;
                }
            }

            const key = `${cpf}_${di}`;
            if (!this.deductions[key]) this.deductions[key] = {};
            
            Object.keys(yearlySums).forEach(year => {
                this.deductions[key][year] = yearlySums[year];
            });

            importedCount++;
        }
        return importedCount;
    }

    // Preparação dos Dados para Exportação Excel
    generateExcelData() {
        return this.appData.map(row => {
            const totalDeductions = this.getTotalDeductions(row.cpf, row.di);
            const calculatedDate = this.calculateNextATSDate(row.ultima, totalDeductions);
            const userDeds = this.getDeductions(row.cpf, row.di);

            let rowData = {
                'Unidade Administrativa': row.ua,
                'CPF': row.cpf,
                'Nome': row.nome,
                'Qt ATS': row.qt,
                'Última Concessão': row.ultima,
                'Data SED (Previsão)': row.setPrevista,
                'Período Aplicado': '2015 a 2026'
            };

            const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
            years.forEach(y => {
                rowData[`Descontos ${y}`] = userDeds[y] || 0;
            });

            rowData['Total de Dias Informados (SED/XML)'] = totalDeductions;
            rowData['Data Calculada (Descongelado)'] = calculatedDate ? format(calculatedDate, 'dd/MM/yyyy') : '-';
            rowData['Status da Análise'] = (row.setPrevista !== '-' && calculatedDate && format(calculatedDate, 'dd/MM/yyyy') !== row.setPrevista) ? 'Divergente' : 'OK';

            return rowData;
        });
    }

    // Search and filter capabilities for View
    getFilteredData(searchTerm) {
        if(!searchTerm) return this.appData;
        const lowTerm = searchTerm.toLowerCase();
        return this.appData.filter(r => 
            r.nome.toLowerCase().includes(lowTerm) || 
            r.cpf.includes(lowTerm) || 
            r.ua.toLowerCase().includes(lowTerm)
        );
    }
}
