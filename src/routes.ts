import { Request, Response, Router } from "express";

import { prismaClient } from "./databases/prismaClient";

import PDFPrinter from "pdfmake";
import { TableCell, TDocumentDefinitions } from "pdfmake/interfaces";

import moment from "moment";

const routes = Router()

routes.get("/products", async (request: Request, response: Response) => {
    const products = await prismaClient.products.findMany();
    return response.json(products);
})

routes.get("/products/report", async (request: Request, response: Response) => {
    const products = await prismaClient.products.findMany();

    const fonts = {
        Helvetica: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };
    const printer = new PDFPrinter(fonts);

    const body = [];
    
    const columnsTitles: TableCell[] = [
        {text: "ID", style: "columnTitle"},
        {text: "Descrição", style: "columnTitle"},
        {text: "Preço", style: "columnTitle"},
        {text: "Quantidade", style: "columnTitle"}
    ]

    const columnsBody = new Array();

    columnsTitles.forEach(column => {
        columnsBody.push(column);
    });
    body.push(columnsBody);

    for await(let product of products){
        const rows = new Array();
        rows.push(product.id);
        rows.push(product.description);
        rows.push(`R$ ${product.price}`);
        rows.push(product.quantity);

        body.push(rows);
    }

    const now = moment().locale("pt-br").format("DD/MM/yyyy hh:mm:ss");

    const documentDefinitions: TDocumentDefinitions = {
        defaultStyle: { font: "Helvetica" },
        content: [
        {
            columns: [
                {
                    text: "Relatório de Produtos", style: "header"
                },
                {
                    text: `${now}\n\n`, style: "header"
                }
            ]
        },    
        {
            table: {
                heights: (row) => {
                    return 30;
                },
                widths: [170, "auto", 50, "auto"],
                body
            }
        }],
        styles: {
            header: {
                fontSize: 14,
                bold: true,
                alignment: "center"
            },
            columnTitle: {
                fontSize: 12,
                bold: true,
                fillColor: "#7159c1",
                color: "#FFFFFF",
                alignment: "center",
                margin: 4
            }
        }
    }

    const pdfDoc = printer.createPdfKitDocument(documentDefinitions);

    const chunks:Buffer[] = [];

    pdfDoc.on("data", (chunk) => {
        chunks.push(chunk);
    })

    pdfDoc.end();

    pdfDoc.on("end", () => {
        const result = Buffer.concat(chunks);
        response.end(result);
    })
})

export { routes };