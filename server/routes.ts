import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabase } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ===== Items API =====
  app.get('/api/items', async (req, res) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

  app.get('/api/items/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(item);
    } catch (error) {
      console.error('Failed to fetch item:', error);
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  });

  app.post('/api/items', async (req, res) => {
    try {
      const item = await storage.createItem(req.body);
      res.status(201).json(item);
    } catch (error) {
      console.error('Failed to create item:', error);
      res.status(500).json({ error: 'Failed to create item' });
    }
  });

  app.put('/api/items/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const item = await storage.updateItem(id, req.body);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(item);
    } catch (error) {
      console.error('Failed to update item:', error);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  app.delete('/api/items/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const deleted = await storage.deleteItem(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete item:', error);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  // ===== Partners API =====
  app.get('/api/partners', async (req, res) => {
    try {
      const partners = await storage.getPartners();
      res.json(partners);
    } catch (error) {
      console.error('Failed to fetch partners:', error);
      res.status(500).json({ error: 'Failed to fetch partners' });
    }
  });

  app.get('/api/partners/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const partner = await storage.getPartner(id);
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      res.json(partner);
    } catch (error) {
      console.error('Failed to fetch partner:', error);
      res.status(500).json({ error: 'Failed to fetch partner' });
    }
  });

  app.post('/api/partners', async (req, res) => {
    try {
      const partner = await storage.createPartner(req.body);
      res.status(201).json(partner);
    } catch (error) {
      console.error('Failed to create partner:', error);
      res.status(500).json({ error: 'Failed to create partner' });
    }
  });

  app.put('/api/partners/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const partner = await storage.updatePartner(id, req.body);
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      res.json(partner);
    } catch (error) {
      console.error('Failed to update partner:', error);
      res.status(500).json({ error: 'Failed to update partner' });
    }
  });

  app.delete('/api/partners/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const deleted = await storage.deletePartner(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete partner:', error);
      res.status(500).json({ error: 'Failed to delete partner' });
    }
  });

  // ===== BOM API =====
  app.get('/api/bom', async (req, res) => {
    try {
      const month = req.query.month as string | undefined;
      const headers = await storage.getBomHeaders(month);
      res.json(headers);
    } catch (error) {
      console.error('Failed to fetch BOM headers:', error);
      res.status(500).json({ error: 'Failed to fetch BOM headers' });
    }
  });

  app.get('/api/bom/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const header = await storage.getBomHeader(id);
      if (!header) {
        return res.status(404).json({ error: 'BOM not found' });
      }
      const lines = await storage.getBomLines(id);
      res.json({ ...header, lines });
    } catch (error) {
      console.error('Failed to fetch BOM:', error);
      res.status(500).json({ error: 'Failed to fetch BOM' });
    }
  });

  app.post('/api/bom', async (req, res) => {
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
      console.error('Failed to create BOM:', error);
      res.status(500).json({ error: 'Failed to create BOM' });
    }
  });

  app.put('/api/bom/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const { lines, ...headerData } = req.body;

      const header = await storage.updateBomHeader(id, headerData);
      if (!header) {
        return res.status(404).json({ error: 'BOM not found' });
      }

      // Replace lines
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
      console.error('Failed to update BOM:', error);
      res.status(500).json({ error: 'Failed to update BOM' });
    }
  });

  app.delete('/api/bom/:id', async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteBomLines(id);
      const deleted = await storage.deleteBomHeader(id);
      if (!deleted) {
        return res.status(404).json({ error: 'BOM not found' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete BOM:', error);
      res.status(500).json({ error: 'Failed to delete BOM' });
    }
  });

  app.post('/api/bom/fix/:month', async (req, res) => {
    try {
      const month = req.params.month;
      const headers = await storage.getBomHeaders(month);

      for (const header of headers) {
        await storage.updateBomHeader(header.id, { isFixed: true });
      }

      res.json({ success: true, count: headers.length });
    } catch (error) {
      console.error('Failed to fix BOMs:', error);
      res.status(500).json({ error: 'Failed to fix BOMs' });
    }
  });

  // ===== Transactions API =====
  app.get('/api/transactions', async (req, res) => {
    try {
      const filter: any = {};

      if (req.query.startDate) {
        filter.start = req.query.startDate as string;
      }
      if (req.query.endDate) {
        filter.end = req.query.endDate as string;
      }
      if (req.query.type) {
        filter.type = req.query.type as string;
      }
      if (req.query.partnerId) {
        filter.partnerId = req.query.partnerId as string;
      }
      if (req.query.itemId) {
        filter.itemId = req.query.itemId as string;
      }

      const transactions = await storage.getTransactions(filter);

      // Include lines for each transaction
      const transactionsWithLines = await Promise.all(
        transactions.map(async (tx) => {
          const lines = await storage.getTxLines(tx.id);
          return { ...tx, lines };
        })
      );

      res.json(transactionsWithLines);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.get('/api/transactions/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      const lines = await storage.getTxLines(id);
      res.json({ ...transaction, lines });
    } catch (error) {
      console.error('Failed to fetch transaction:', error);
      res.status(500).json({ error: 'Failed to fetch transaction' });
    }
  });

  app.post('/api/transactions', async (req, res) => {
    try {
      // Frontend sends { transaction: {...}, lines: [...] }
      const { transaction: txData, lines } = req.body;

      // ===== Phase 1: 재고 부족 체크 (process.md 원칙) =====
      if (lines && Array.isArray(lines)) {
        const inventoryCheck = await storage.validateInventoryAvailability(
          lines,
          txData.date
        );

        if (!inventoryCheck.valid) {
          // 품목 정보 일괄 조회 (Codex 리뷰 반영: N+1 방지)
          const itemIds = inventoryCheck.errors.map((e) => e.itemId);
          const { data: items } = await supabase
            .from("items")
            .select("id, name, code")
            .in("id", itemIds);

          const itemMap = new Map(
            (items ?? []).map((i: any) => [i.id, i])
          );

          const errorDetails = inventoryCheck.errors.map((err) => {
            const item = itemMap.get(err.itemId);
            return {
              itemId: err.itemId,
              itemName: item?.name || err.itemId,
              itemCode: item?.code || '',
              available: err.available,
              required: err.required
            };
          });

          return res.status(400).json({
            error: '재고 부족',
            code: 'INSUFFICIENT_INVENTORY',
            details: errorDetails
          });
        }
      }

      // ===== Phase 2: BOM 자동 차감 (PRODUCTION_WELD, PRODUCTION_PAINT) =====
      const productionTypes = ['PRODUCTION_WELD', 'PRODUCTION_PAINT'];
      if (productionTypes.includes(txData.type) && lines && Array.isArray(lines)) {
        // 생산 라인 찾기 (양수 수량)
        const productionLine = lines.find(
          (l: any) => parseFloat(l.quantity) > 0
        );

        if (productionLine) {
          const month = txData.date.substring(0, 7);
          const bom = await storage.getBomByProductAndMonth(productionLine.itemId, month);

          // BOM 기반 차감 라인 자동 생성
          const consumptionLines = storage.generateConsumptionLines(
            bom,
            parseFloat(productionLine.quantity)
          );

          // 차감 라인 재고 검증
          if (consumptionLines.length > 0) {
            const consumptionCheck = await storage.validateInventoryAvailability(
              consumptionLines,
              txData.date
            );

            if (!consumptionCheck.valid) {
              // 품목 정보 조회
              const itemIds = consumptionCheck.errors.map((e) => e.itemId);
              const { data: items } = await supabase
                .from("items")
                .select("id, name, code")
                .in("id", itemIds);

              const itemMap = new Map(
                (items ?? []).map((i: any) => [i.id, i])
              );

              const errorDetails = consumptionCheck.errors.map((err) => {
                const item = itemMap.get(err.itemId);
                return {
                  itemId: err.itemId,
                  itemName: item?.name || err.itemId,
                  itemCode: item?.code || '',
                  available: err.available,
                  required: err.required
                };
              });

              return res.status(400).json({
                error: '자재 재고 부족',
                code: 'INSUFFICIENT_INVENTORY',
                details: errorDetails
              });
            }
          }

          // 최종 라인 = 생산 라인 + 차감 라인
          const finalLines = [productionLine, ...consumptionLines];

          // 트랜잭션 생성
          const transaction = await storage.createTransaction(txData);

          // 라인 일괄 저장
          if (finalLines.length > 0) {
            const linesToInsert = finalLines.map((line: any) => ({
              transaction_id: transaction.id,
              item_id: line.item_id || line.itemId,
              quantity: line.quantity,
              price: line.price ?? null,
              amount: line.amount ?? null
            }));

            const { error: linesError } = await supabase
              .from("tx_lines")
              .insert(linesToInsert);

            if (linesError) {
              await storage.deleteTransaction(transaction.id);
              throw linesError;
            }
          }

          const createdLines = await storage.getTxLines(transaction.id);
          return res.status(201).json({ ...transaction, lines: createdLines });
        }
      }

      // ===== 트랜잭션 생성 (비 생산 트랜잭션) =====
      const transaction = await storage.createTransaction(txData);

      // 라인 일괄 저장 (Codex 리뷰 반영: 순차 await → 일괄 insert)
      if (lines && Array.isArray(lines) && lines.length > 0) {
        const linesToInsert = lines.map((line: any) => ({
          transaction_id: transaction.id,
          item_id: line.item_id || line.itemId,
          quantity: line.quantity,
          price: line.price ?? null,
          amount: line.amount ?? null
        }));

        const { error: linesError } = await supabase
          .from("tx_lines")
          .insert(linesToInsert);

        if (linesError) {
          // 트랜잭션 롤백 (라인 저장 실패 시)
          await storage.deleteTransaction(transaction.id);
          throw linesError;
        }
      }

      const createdLines = await storage.getTxLines(transaction.id);
      res.status(201).json({ ...transaction, lines: createdLines });
    } catch (error) {
      console.error('Failed to create transaction:', error);
      // Return detailed error for debugging
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      res.status(500).json({ error: 'Failed to create transaction', details: errorMessage });
    }
  });

  app.delete('/api/transactions/:id', async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteTxLines(id);
      const deleted = await storage.deleteTransaction(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      res.status(500).json({ error: 'Failed to delete transaction' });
    }
  });

  // ===== Monthly Prices API =====
  app.get('/api/monthly-prices', async (req, res) => {
    try {
      const month = req.query.month as string | undefined;
      const prices = await storage.getMonthlyPrices(month);
      res.json(prices);
    } catch (error) {
      console.error('Failed to fetch monthly prices:', error);
      res.status(500).json({ error: 'Failed to fetch monthly prices' });
    }
  });

  app.post('/api/monthly-prices', async (req, res) => {
    try {
      const price = await storage.createMonthlyPrice(req.body);
      res.status(201).json(price);
    } catch (error) {
      console.error('Failed to create monthly price:', error);
      res.status(500).json({ error: 'Failed to create monthly price' });
    }
  });

  app.put('/api/monthly-prices/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const price = await storage.updateMonthlyPrice(id, req.body);
      if (!price) {
        return res.status(404).json({ error: 'Monthly price not found' });
      }
      res.json(price);
    } catch (error) {
      console.error('Failed to update monthly price:', error);
      res.status(500).json({ error: 'Failed to update monthly price' });
    }
  });

  app.delete('/api/monthly-prices/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const deleted = await storage.deleteMonthlyPrice(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Monthly price not found' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete monthly price:', error);
      res.status(500).json({ error: 'Failed to delete monthly price' });
    }
  });

  app.get('/api/monthly-prices/status/:month', async (req, res) => {
    try {
      const month = req.params.month;
      const status = await storage.getMonthlyPriceStatus(month);
      res.json(status || { month, isFixed: false });
    } catch (error) {
      console.error('Failed to fetch price status:', error);
      res.status(500).json({ error: 'Failed to fetch price status' });
    }
  });

  app.post('/api/monthly-prices/fix/:month', async (req, res) => {
    try {
      const month = req.params.month;
      const status = await storage.setMonthlyPriceStatus({
        month,
        isFixed: true,
        fixedAt: new Date()
      });
      res.json(status);
    } catch (error) {
      console.error('Failed to fix prices:', error);
      res.status(500).json({ error: 'Failed to fix prices' });
    }
  });

  // ===== Inventory API =====
  app.get('/api/inventory/:itemId', async (req, res) => {
    try {
      const itemId = req.params.itemId;
      const date = req.query.date as string | undefined;

      const filter: any = {};
      if (date) {
        filter.end = date;
      }

      const transactions = await storage.getTransactions(filter);
      let quantity = 0;

      for (const tx of transactions) {
        const lines = await storage.getTxLines(tx.id);
        for (const line of lines) {
          if (line.itemId === itemId) {
            // Apply sign based on transaction type
            const sign = getTransactionSign(tx.type);
            quantity += sign * parseFloat(line.quantity);
          }
        }
      }

      res.json({ itemId, quantity, asOfDate: date || new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Failed to calculate inventory:', error);
      res.status(500).json({ error: 'Failed to calculate inventory' });
    }
  });

  app.get('/api/inventory/:itemId/ledger', async (req, res) => {
    try {
      const itemId = req.params.itemId;
      const start = req.query.start as string | undefined;
      const end = req.query.end as string | undefined;

      const filter: any = {};
      if (start) filter.start = start;
      if (end) filter.end = end;

      const transactions = await storage.getTransactions(filter);
      const ledgerEntries: any[] = [];

      // Calculate opening balance if start date is provided
      let balance = 0;
      if (start) {
        const priorTxs = await storage.getTransactions({ end: start });
        for (const tx of priorTxs) {
          const lines = await storage.getTxLines(tx.id);
          for (const line of lines) {
            if (line.itemId === itemId) {
              const sign = getTransactionSign(tx.type);
              balance += sign * parseFloat(line.quantity);
            }
          }
        }

        ledgerEntries.push({
          date: start,
          type: 'OPENING_BALANCE',
          typeName: '기초재고',
          inQty: 0,
          outQty: 0,
          balance
        });
      }

      // Process transactions
      for (const tx of transactions) {
        const lines = await storage.getTxLines(tx.id);
        for (const line of lines) {
          if (line.itemId === itemId) {
            const sign = getTransactionSign(tx.type);
            const qty = parseFloat(line.quantity);
            const inQty = sign > 0 ? qty : 0;
            const outQty = sign < 0 ? qty : 0;
            balance += sign * qty;

            // Get partner name if exists
            let partnerName: string | undefined;
            if (tx.partnerId) {
              const partner = await storage.getPartner(tx.partnerId);
              partnerName = partner?.name;
            }

            ledgerEntries.push({
              date: tx.date,
              type: tx.type,
              typeName: getTransactionTypeName(tx.type),
              partnerName,
              inQty,
              outQty,
              balance,
              remarks: tx.remarks,
              transactionId: tx.id
            });
          }
        }
      }

      res.json(ledgerEntries);
    } catch (error) {
      console.error('Failed to generate ledger:', error);
      res.status(500).json({ error: 'Failed to generate ledger' });
    }
  });

  // ===== Snapshots API (월마감) =====
  app.get('/api/snapshots', async (req, res) => {
    try {
      const snapshots = await storage.getInventorySnapshots();
      res.json(snapshots);
    } catch (error) {
      console.error('Failed to fetch snapshots:', error);
      res.status(500).json({ error: 'Failed to fetch snapshots' });
    }
  });

  app.get('/api/snapshots/:month', async (req, res) => {
    try {
      const month = req.params.month;
      const snapshot = await storage.getInventorySnapshotByMonth(month);
      if (!snapshot) {
        return res.status(404).json({ error: 'Snapshot not found' });
      }
      const lines = await storage.getSnapshotLines(snapshot.id);
      res.json({ ...snapshot, lines });
    } catch (error) {
      console.error('Failed to fetch snapshot:', error);
      res.status(500).json({ error: 'Failed to fetch snapshot' });
    }
  });

  app.post('/api/snapshots', async (req, res) => {
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
      console.error('Failed to create snapshot:', error);
      res.status(500).json({ error: 'Failed to create snapshot' });
    }
  });

  app.put('/api/snapshot-lines/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const line = await storage.updateSnapshotLine(id, req.body);
      if (!line) {
        return res.status(404).json({ error: 'Snapshot line not found' });
      }
      res.json(line);
    } catch (error) {
      console.error('Failed to update snapshot line:', error);
      res.status(500).json({ error: 'Failed to update snapshot line' });
    }
  });

  app.post('/api/snapshots/:month/close', async (req, res) => {
    try {
      const month = req.params.month;
      const snapshot = await storage.getInventorySnapshotByMonth(month);
      if (!snapshot) {
        return res.status(404).json({ error: 'Snapshot not found' });
      }

      // 1. 조정 트랜잭션 생성 (차이분이 있는 경우)
      const adjustmentTxId = await storage.createAdjustmentTransactions(month);

      // 2. 스냅샷 상태 CLOSED로 변경 + adjustmentTxId 저장
      const updated = await storage.updateInventorySnapshot(snapshot.id, {
        status: 'CLOSED',
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
      console.error('Failed to close snapshot:', error);
      res.status(500).json({ error: 'Failed to close snapshot' });
    }
  });

  return httpServer;
}

// Helper functions
function getTransactionSign(type: string): number {
  switch (type) {
    case 'PURCHASE_RECEIPT':
    case 'PRODUCTION_PRESS':
    case 'PRODUCTION_WELD':
    case 'PRODUCTION_PAINT':
      return 1; // Positive (increase inventory)
    case 'SHIPMENT':
    case 'SCRAP_SHIPMENT':
      return -1; // Negative (decrease inventory)
    case 'ADJUSTMENT':
      return 1; // Adjustment can be + or - (handled by line quantity sign)
    case 'TRANSFER':
      return 0; // Transfer is neutral (or handle separately by location)
    default:
      return 0;
  }
}

function getTransactionTypeName(type: string): string {
  const TRANSACTION_TYPE_LABELS: Record<string, string> = {
    OPENING_BALANCE: '기초재고',
    PURCHASE_RECEIPT: '구매입고',
    PRODUCTION_PRESS: '프레스생산',
    PRODUCTION_WELD: '용접생산',
    PRODUCTION_PAINT: '도장생산',
    SHIPMENT: '제품출고',
    SCRAP_SHIPMENT: '스크랩반출',
    ADJUSTMENT: '재고조정',
    TRANSFER: '이동',
  };
  return TRANSACTION_TYPE_LABELS[type] || type;
}
