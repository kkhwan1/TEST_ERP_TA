import express, { type Request, Response, NextFunction } from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../server/storage";
import { supabase } from "../server/db";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS for Vercel
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// ===== Items API =====
app.get("/api/items", async (req, res) => {
  try {
    const items = await storage.getItems();
    res.json(items);
  } catch (error) {
    console.error("Failed to fetch items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

app.post("/api/items", async (req, res) => {
  try {
    const item = await storage.createItem(req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error("Failed to create item:", error);
    res.status(500).json({ error: "Failed to create item" });
  }
});

app.put("/api/items/:id", async (req, res) => {
  try {
    const item = await storage.updateItem(req.params.id, req.body);
    res.json(item);
  } catch (error) {
    console.error("Failed to update item:", error);
    res.status(500).json({ error: "Failed to update item" });
  }
});

app.delete("/api/items/:id", async (req, res) => {
  try {
    await storage.deleteItem(req.params.id);
    res.status(204).end();
  } catch (error) {
    console.error("Failed to delete item:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// ===== Partners API =====
app.get("/api/partners", async (req, res) => {
  try {
    const partners = await storage.getPartners();
    res.json(partners);
  } catch (error) {
    console.error("Failed to fetch partners:", error);
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

app.post("/api/partners", async (req, res) => {
  try {
    const partner = await storage.createPartner(req.body);
    res.status(201).json(partner);
  } catch (error) {
    console.error("Failed to create partner:", error);
    res.status(500).json({ error: "Failed to create partner" });
  }
});

app.put("/api/partners/:id", async (req, res) => {
  try {
    const partner = await storage.updatePartner(req.params.id, req.body);
    res.json(partner);
  } catch (error) {
    console.error("Failed to update partner:", error);
    res.status(500).json({ error: "Failed to update partner" });
  }
});

app.delete("/api/partners/:id", async (req, res) => {
  try {
    await storage.deletePartner(req.params.id);
    res.status(204).end();
  } catch (error) {
    console.error("Failed to delete partner:", error);
    res.status(500).json({ error: "Failed to delete partner" });
  }
});

// ===== BOM API =====
app.get("/api/bom", async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const headers = await storage.getBomHeaders(month);
    res.json(headers);
  } catch (error) {
    console.error("Failed to fetch BOM headers:", error);
    res.status(500).json({ error: "Failed to fetch BOM headers" });
  }
});

app.get("/api/bom/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const header = await storage.getBomHeader(id);
    if (!header) {
      return res.status(404).json({ error: "BOM not found" });
    }
    const lines = await storage.getBomLines(id);
    res.json({ ...header, lines });
  } catch (error) {
    console.error("Failed to fetch BOM:", error);
    res.status(500).json({ error: "Failed to fetch BOM" });
  }
});

app.post("/api/bom", async (req, res) => {
  try {
    const { header: headerData, lines } = req.body;
    const header = await storage.createBomHeader(headerData);

    if (lines && Array.isArray(lines)) {
      for (const line of lines) {
        await storage.createBomLine({
          ...line,
          bomHeaderId: header.id
        });
      }
    }

    const createdLines = await storage.getBomLines(header.id);
    res.status(201).json({ ...header, lines: createdLines });
  } catch (error) {
    console.error("Failed to create BOM:", error);
    res.status(500).json({ error: "Failed to create BOM" });
  }
});

app.put("/api/bom/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { lines, ...headerData } = req.body;

    const header = await storage.updateBomHeader(id, headerData);
    if (!header) {
      return res.status(404).json({ error: "BOM not found" });
    }

    await storage.deleteBomLines(id);
    if (lines && Array.isArray(lines)) {
      for (const line of lines) {
        await storage.createBomLine({
          ...line,
          bomHeaderId: id
        });
      }
    }

    const updatedLines = await storage.getBomLines(id);
    res.json({ ...header, lines: updatedLines });
  } catch (error) {
    console.error("Failed to update BOM:", error);
    res.status(500).json({ error: "Failed to update BOM" });
  }
});

app.delete("/api/bom/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await storage.deleteBomLines(id);
    await storage.deleteBomHeader(id);
    res.status(204).end();
  } catch (error) {
    console.error("Failed to delete BOM:", error);
    res.status(500).json({ error: "Failed to delete BOM" });
  }
});

app.post("/api/bom/fix/:month", async (req, res) => {
  try {
    const month = req.params.month;
    const headers = await storage.getBomHeaders(month);
    for (const header of headers) {
      await storage.updateBomHeader(header.id, { isFixed: true });
    }
    res.json({ success: true, count: headers.length });
  } catch (error) {
    console.error("Failed to fix BOM:", error);
    res.status(500).json({ error: "Failed to fix BOM" });
  }
});

// ===== Transactions API =====
app.get("/api/transactions", async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.startDate) filter.start = req.query.startDate as string;
    if (req.query.endDate) filter.end = req.query.endDate as string;
    if (req.query.type) filter.type = req.query.type as string;
    if (req.query.partnerId) filter.partnerId = req.query.partnerId as string;
    if (req.query.itemId) filter.itemId = req.query.itemId as string;

    const transactions = await storage.getTransactions(filter);
    const transactionsWithLines = await Promise.all(
      transactions.map(async (tx) => {
        const lines = await storage.getTxLines(tx.id);
        return { ...tx, lines };
      })
    );
    res.json(transactionsWithLines);
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const { transaction: txData, lines } = req.body;

    // Inventory validation
    if (lines && Array.isArray(lines)) {
      const inventoryCheck = await storage.validateInventoryAvailability(lines, txData.date);
      if (!inventoryCheck.valid) {
        const itemIds = inventoryCheck.errors.map((e) => e.itemId);
        const { data: items } = await supabase.from("items").select("id, name, code").in("id", itemIds);
        const itemMap = new Map((items ?? []).map((i: any) => [i.id, i]));
        const errorDetails = inventoryCheck.errors.map((err) => {
          const item = itemMap.get(err.itemId);
          return {
            itemId: err.itemId,
            itemName: item?.name || err.itemId,
            itemCode: item?.code || "",
            available: err.available,
            required: err.required
          };
        });
        return res.status(400).json({
          error: "재고 부족",
          code: "INSUFFICIENT_INVENTORY",
          details: errorDetails
        });
      }
    }

    // BOM auto-deduction for production
    const productionTypes = ["PRODUCTION_WELD", "PRODUCTION_PAINT"];
    if (productionTypes.includes(txData.type) && lines && Array.isArray(lines)) {
      const productionLine = lines.find((l: any) => parseFloat(l.quantity) > 0);
      if (productionLine) {
        const month = txData.date.substring(0, 7);
        const bom = await storage.getBomByProductAndMonth(productionLine.itemId, month);
        const consumptionLines = storage.generateConsumptionLines(bom, parseFloat(productionLine.quantity));

        if (consumptionLines.length > 0) {
          const consumptionCheck = await storage.validateInventoryAvailability(consumptionLines, txData.date);
          if (!consumptionCheck.valid) {
            const itemIds = consumptionCheck.errors.map((e) => e.itemId);
            const { data: items } = await supabase.from("items").select("id, name, code").in("id", itemIds);
            const itemMap = new Map((items ?? []).map((i: any) => [i.id, i]));
            const errorDetails = consumptionCheck.errors.map((err) => {
              const item = itemMap.get(err.itemId);
              return {
                itemId: err.itemId,
                itemName: item?.name || err.itemId,
                itemCode: item?.code || "",
                available: err.available,
                required: err.required
              };
            });
            return res.status(400).json({
              error: "자재 재고 부족",
              code: "INSUFFICIENT_INVENTORY",
              details: errorDetails
            });
          }
        }

        const finalLines = [productionLine, ...consumptionLines];
        const transaction = await storage.createTransaction(txData);

        if (finalLines.length > 0) {
          const linesToInsert = finalLines.map((line: any) => ({
            transaction_id: transaction.id,
            item_id: line.item_id || line.itemId,
            quantity: line.quantity,
            price: line.price ?? null,
            amount: line.amount ?? null
          }));
          const { error: linesError } = await supabase.from("tx_lines").insert(linesToInsert);
          if (linesError) {
            await storage.deleteTransaction(transaction.id);
            throw linesError;
          }
        }

        const createdLines = await storage.getTxLines(transaction.id);
        return res.status(201).json({ ...transaction, lines: createdLines });
      }
    }

    // Normal transaction
    const transaction = await storage.createTransaction(txData);
    if (lines && Array.isArray(lines) && lines.length > 0) {
      const linesToInsert = lines.map((line: any) => ({
        transaction_id: transaction.id,
        item_id: line.item_id || line.itemId,
        quantity: line.quantity,
        price: line.price ?? null,
        amount: line.amount ?? null
      }));
      const { error: linesError } = await supabase.from("tx_lines").insert(linesToInsert);
      if (linesError) {
        await storage.deleteTransaction(transaction.id);
        throw linesError;
      }
    }

    const createdLines = await storage.getTxLines(transaction.id);
    res.status(201).json({ ...transaction, lines: createdLines });
  } catch (error) {
    console.error("Failed to create transaction:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    res.status(500).json({ error: "Failed to create transaction", details: errorMessage });
  }
});

app.delete("/api/transactions/:id", async (req, res) => {
  try {
    await storage.deleteTxLines(req.params.id);
    await storage.deleteTransaction(req.params.id);
    res.status(204).end();
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// ===== Monthly Prices API =====
app.get("/api/monthly-prices", async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const prices = await storage.getMonthlyPrices(month);
    res.json(prices);
  } catch (error) {
    console.error("Failed to fetch monthly prices:", error);
    res.status(500).json({ error: "Failed to fetch monthly prices" });
  }
});

app.post("/api/monthly-prices", async (req, res) => {
  try {
    const price = await storage.createMonthlyPrice(req.body);
    res.status(201).json(price);
  } catch (error) {
    console.error("Failed to create monthly price:", error);
    res.status(500).json({ error: "Failed to create monthly price" });
  }
});

app.put("/api/monthly-prices/:id", async (req, res) => {
  try {
    const price = await storage.updateMonthlyPrice(req.params.id, req.body);
    res.json(price);
  } catch (error) {
    console.error("Failed to update monthly price:", error);
    res.status(500).json({ error: "Failed to update monthly price" });
  }
});

app.delete("/api/monthly-prices/:id", async (req, res) => {
  try {
    await storage.deleteMonthlyPrice(req.params.id);
    res.status(204).end();
  } catch (error) {
    console.error("Failed to delete monthly price:", error);
    res.status(500).json({ error: "Failed to delete monthly price" });
  }
});

app.get("/api/monthly-prices/status/:month", async (req, res) => {
  try {
    const status = await storage.getMonthlyPriceStatus(req.params.month);
    res.json(status || { month: req.params.month, isFixed: false });
  } catch (error) {
    console.error("Failed to fetch price status:", error);
    res.status(500).json({ error: "Failed to fetch price status" });
  }
});

app.post("/api/monthly-prices/fix/:month", async (req, res) => {
  try {
    const status = await storage.setMonthlyPriceStatus({
      month: req.params.month,
      isFixed: true,
      fixedAt: new Date()
    });
    res.json(status);
  } catch (error) {
    console.error("Failed to fix prices:", error);
    res.status(500).json({ error: "Failed to fix prices" });
  }
});

// ===== Inventory API =====
app.get("/api/inventory/:itemId", async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const date = req.query.date as string | undefined;
    const quantity = await storage.getInventory(itemId, date);
    res.json({ itemId, quantity, asOfDate: date || new Date().toISOString().split("T")[0] });
  } catch (error) {
    console.error("Failed to calculate inventory:", error);
    res.status(500).json({ error: "Failed to calculate inventory" });
  }
});

// ===== Snapshots API =====
app.get("/api/snapshots", async (req, res) => {
  try {
    const snapshots = await storage.getInventorySnapshots();
    res.json(snapshots);
  } catch (error) {
    console.error("Failed to fetch snapshots:", error);
    res.status(500).json({ error: "Failed to fetch snapshots" });
  }
});

app.get("/api/snapshots/:month", async (req, res) => {
  try {
    const snapshot = await storage.getInventorySnapshotByMonth(req.params.month);
    if (!snapshot) {
      return res.status(404).json({ error: "Snapshot not found" });
    }
    const lines = await storage.getSnapshotLines(snapshot.id);
    res.json({ ...snapshot, lines });
  } catch (error) {
    console.error("Failed to fetch snapshot:", error);
    res.status(500).json({ error: "Failed to fetch snapshot" });
  }
});

app.post("/api/snapshots", async (req, res) => {
  try {
    const { lines, ...snapshotData } = req.body;
    const snapshot = await storage.createInventorySnapshot(snapshotData);

    if (lines && Array.isArray(lines)) {
      for (const line of lines) {
        await storage.createSnapshotLine({
          ...line,
          snapshotId: snapshot.id
        });
      }
    }

    const createdLines = await storage.getSnapshotLines(snapshot.id);
    res.status(201).json({ ...snapshot, lines: createdLines });
  } catch (error) {
    console.error("Failed to create snapshot:", error);
    res.status(500).json({ error: "Failed to create snapshot" });
  }
});

app.put("/api/snapshot-lines/:id", async (req, res) => {
  try {
    const line = await storage.updateSnapshotLine(req.params.id, req.body);
    res.json(line);
  } catch (error) {
    console.error("Failed to update snapshot line:", error);
    res.status(500).json({ error: "Failed to update snapshot line" });
  }
});

app.post("/api/snapshots/:month/close", async (req, res) => {
  try {
    const month = req.params.month;
    const snapshot = await storage.getInventorySnapshotByMonth(month);
    if (!snapshot) {
      return res.status(404).json({ error: "Snapshot not found" });
    }

    const adjustmentTxId = await storage.createAdjustmentTransactions(month);
    const updated = await storage.updateInventorySnapshot(snapshot.id, {
      status: "CLOSED",
      closedAt: new Date(),
      adjustmentTxId: adjustmentTxId || undefined
    });

    res.json({
      ...updated,
      message: adjustmentTxId
        ? `${month} 월마감 완료. 조정 트랜잭션 생성됨.`
        : `${month} 월마감 완료. 조정 항목 없음.`
    });
  } catch (error) {
    console.error("Failed to close snapshot:", error);
    res.status(500).json({ error: "Failed to close snapshot" });
  }
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Vercel serverless handler
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
