import { supabase } from "./db";
import {
  type User,
  type InsertUser,
  type Item,
  type InsertItem,
  type Partner,
  type InsertPartner,
  type BomHeader,
  type InsertBomHeader,
  type BomLine,
  type InsertBomLine,
  type Transaction,
  type InsertTransaction,
  type TxLine,
  type InsertTxLine,
  type MonthlyPrice,
  type InsertMonthlyPrice,
  type MonthlyPriceStatus,
  type InsertMonthlyPriceStatus,
  type InventorySnapshot,
  type InsertInventorySnapshot,
  type InventorySnapshotLine,
  type InsertInventorySnapshotLine,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Items
  getItems(): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;

  // Partners
  getPartners(): Promise<Partner[]>;
  getPartner(id: string): Promise<Partner | undefined>;
  createPartner(partner: InsertPartner): Promise<Partner>;
  updatePartner(
    id: string,
    partner: Partial<InsertPartner>
  ): Promise<Partner | undefined>;
  deletePartner(id: string): Promise<boolean>;

  // BOM
  getBomHeaders(month?: string): Promise<BomHeader[]>;
  getBomHeader(id: string): Promise<BomHeader | undefined>;
  createBomHeader(bom: InsertBomHeader): Promise<BomHeader>;
  updateBomHeader(
    id: string,
    updates: Partial<InsertBomHeader>
  ): Promise<BomHeader | undefined>;
  deleteBomHeader(id: string): Promise<boolean>;
  getBomLines(bomHeaderId: string): Promise<BomLine[]>;
  createBomLine(line: InsertBomLine): Promise<BomLine>;
  deleteBomLines(bomHeaderId: string): Promise<void>;

  // Transactions
  getTransactions(filter?: {
    start?: string;
    end?: string;
    type?: string;
    partnerId?: string;
    itemId?: string;
  }): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  deleteTransaction(id: string): Promise<boolean>;
  getTxLines(transactionId: string): Promise<TxLine[]>;
  createTxLine(line: InsertTxLine): Promise<TxLine>;
  deleteTxLines(transactionId: string): Promise<void>;

  // Monthly Prices
  getMonthlyPrices(month?: string): Promise<MonthlyPrice[]>;
  createMonthlyPrice(price: InsertMonthlyPrice): Promise<MonthlyPrice>;
  updateMonthlyPrice(
    id: string,
    updates: Partial<InsertMonthlyPrice>
  ): Promise<MonthlyPrice | undefined>;
  deleteMonthlyPrice(id: string): Promise<boolean>;
  getMonthlyPriceStatus(month: string): Promise<MonthlyPriceStatus | undefined>;
  setMonthlyPriceStatus(
    status: InsertMonthlyPriceStatus
  ): Promise<MonthlyPriceStatus>;

  // Inventory Snapshots
  getInventorySnapshots(): Promise<InventorySnapshot[]>;
  getInventorySnapshot(id: string): Promise<InventorySnapshot | undefined>;
  getInventorySnapshotByMonth(
    month: string
  ): Promise<InventorySnapshot | undefined>;
  createInventorySnapshot(
    snapshot: InsertInventorySnapshot
  ): Promise<InventorySnapshot>;
  updateInventorySnapshot(
    id: string,
    updates: Partial<InsertInventorySnapshot>
  ): Promise<InventorySnapshot | undefined>;
  getSnapshotLines(snapshotId: string): Promise<InventorySnapshotLine[]>;
  createSnapshotLine(
    line: InsertInventorySnapshotLine
  ): Promise<InventorySnapshotLine>;
  updateSnapshotLine(
    id: string,
    updates: Partial<InsertInventorySnapshotLine>
  ): Promise<InventorySnapshotLine | undefined>;
}

export class SupabaseStorage implements IStorage {
  // ===== Users =====
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .insert(insertUser)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  }

  // ===== Items =====
  async getItems(): Promise<Item[]> {
    const { data, error } = await supabase.from("items").select("*");

    if (error) throw error;
    return data as Item[];
  }

  async getItem(id: string): Promise<Item | undefined> {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as Item;
  }

  async createItem(item: InsertItem): Promise<Item> {
    const { data, error } = await supabase
      .from("items")
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data as Item;
  }

  async updateItem(
    id: string,
    item: Partial<InsertItem>
  ): Promise<Item | undefined> {
    const { data, error } = await supabase
      .from("items")
      .update(item)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as Item;
  }

  async deleteItem(id: string): Promise<boolean> {
    const { error } = await supabase.from("items").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") return false; // Not found
      throw error;
    }
    return true;
  }

  // ===== Partners =====
  async getPartners(): Promise<Partner[]> {
    const { data, error } = await supabase.from("partners").select("*");

    if (error) throw error;
    return data as Partner[];
  }

  async getPartner(id: string): Promise<Partner | undefined> {
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as Partner;
  }

  async createPartner(partner: InsertPartner): Promise<Partner> {
    // Convert camelCase to snake_case for Supabase
    const snakeCasePartner: Record<string, any> = {};
    for (const [key, value] of Object.entries(partner)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeCasePartner[snakeKey] = value;
    }

    const { data, error } = await supabase
      .from("partners")
      .insert(snakeCasePartner)
      .select()
      .single();

    if (error) {
      console.error("Failed to create partner:", error);
      throw error;
    }
    return data as Partner;
  }

  async updatePartner(
    id: string,
    partner: Partial<InsertPartner>
  ): Promise<Partner | undefined> {
    const { data, error } = await supabase
      .from("partners")
      .update(partner)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as Partner;
  }

  async deletePartner(id: string): Promise<boolean> {
    const { error } = await supabase.from("partners").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") return false; // Not found
      throw error;
    }
    return true;
  }

  // ===== BOM =====
  async getBomHeaders(month?: string): Promise<BomHeader[]> {
    let query = supabase.from("bom_headers").select("*");

    if (month) {
      query = query.eq("version", month);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as BomHeader[];
  }

  async getBomHeader(id: string): Promise<BomHeader | undefined> {
    const { data, error } = await supabase
      .from("bom_headers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as BomHeader;
  }

  async createBomHeader(bom: InsertBomHeader): Promise<BomHeader> {
    // Convert camelCase to snake_case for Supabase
    const snakeCaseBom = {
      item_id: bom.itemId,
      version: bom.version,
      is_fixed: bom.isFixed ?? false,
    };

    const { data, error } = await supabase
      .from("bom_headers")
      .insert(snakeCaseBom)
      .select()
      .single();

    if (error) throw error;
    return data as BomHeader;
  }

  async updateBomHeader(
    id: string,
    updates: Partial<InsertBomHeader>
  ): Promise<BomHeader | undefined> {
    // Convert camelCase to snake_case for Supabase
    const snakeCaseUpdates: Record<string, any> = {};
    if (updates.itemId !== undefined) snakeCaseUpdates.item_id = updates.itemId;
    if (updates.version !== undefined) snakeCaseUpdates.version = updates.version;
    if (updates.isFixed !== undefined) snakeCaseUpdates.is_fixed = updates.isFixed;

    const { data, error } = await supabase
      .from("bom_headers")
      .update(snakeCaseUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as BomHeader;
  }

  async deleteBomHeader(id: string): Promise<boolean> {
    const { error } = await supabase.from("bom_headers").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") return false; // Not found
      throw error;
    }
    return true;
  }

  async getBomLines(bomHeaderId: string): Promise<BomLine[]> {
    const { data, error } = await supabase
      .from("bom_lines")
      .select("*")
      .eq("bom_header_id", bomHeaderId);

    if (error) throw error;
    return data as BomLine[];
  }

  async createBomLine(line: InsertBomLine): Promise<BomLine> {
    // Convert camelCase to snake_case for Supabase
    const snakeCaseLine = {
      bom_header_id: line.bomHeaderId,
      material_id: line.materialId,
      quantity: line.quantity,
      process: line.process,
    };

    const { data, error } = await supabase
      .from("bom_lines")
      .insert(snakeCaseLine)
      .select()
      .single();

    if (error) throw error;
    return data as BomLine;
  }

  async deleteBomLines(bomHeaderId: string): Promise<void> {
    const { error } = await supabase
      .from("bom_lines")
      .delete()
      .eq("bom_header_id", bomHeaderId);

    if (error) throw error;
  }

  // ===== Transactions =====
  async getTransactions(filter?: {
    start?: string;
    end?: string;
    type?: string;
    partnerId?: string;
    itemId?: string;
  }): Promise<Transaction[]> {
    let query = supabase.from("transactions").select("*");

    if (filter?.start) {
      query = query.gte("date", filter.start);
    }
    if (filter?.end) {
      query = query.lte("date", filter.end);
    }
    if (filter?.type) {
      query = query.eq("type", filter.type);
    }
    if (filter?.partnerId) {
      query = query.eq("partner_id", filter.partnerId);
    }

    const { data, error } = await query;

    if (error) throw error;

    let results = data as Transaction[];

    // If filtering by itemId, need to join with tx_lines
    if (filter?.itemId) {
      const { data: linesData, error: linesError } = await supabase
        .from("tx_lines")
        .select("transaction_id")
        .eq("item_id", filter.itemId);

      if (linesError) throw linesError;

      const txIds = new Set(linesData.map((line) => line.transaction_id));
      results = results.filter((tx) => txIds.has(tx.id));
    }

    return results;
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as Transaction;
  }

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    // Convert camelCase to snake_case for Supabase
    const snakeCaseTx: Record<string, any> = {};
    for (const [key, value] of Object.entries(tx)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeCaseTx[snakeKey] = value;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert(snakeCaseTx)
      .select()
      .single();

    if (error) throw error;
    return data as Transaction;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) {
      if (error.code === "PGRST116") return false; // Not found
      throw error;
    }
    return true;
  }

  async getTxLines(transactionId: string): Promise<TxLine[]> {
    const { data, error } = await supabase
      .from("tx_lines")
      .select("*")
      .eq("transaction_id", transactionId);

    if (error) throw error;
    return data as TxLine[];
  }

  async createTxLine(line: InsertTxLine): Promise<TxLine> {
    const { data, error } = await supabase
      .from("tx_lines")
      .insert(line)
      .select()
      .single();

    if (error) throw error;
    return data as TxLine;
  }

  async deleteTxLines(transactionId: string): Promise<void> {
    const { error } = await supabase
      .from("tx_lines")
      .delete()
      .eq("transaction_id", transactionId);

    if (error) throw error;
  }

  // ===== Monthly Prices =====
  async getMonthlyPrices(month?: string): Promise<MonthlyPrice[]> {
    let query = supabase.from("monthly_prices").select("*");

    if (month) {
      query = query.eq("month", month);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as MonthlyPrice[];
  }

  async createMonthlyPrice(price: InsertMonthlyPrice): Promise<MonthlyPrice> {
    const { data, error } = await supabase
      .from("monthly_prices")
      .insert(price)
      .select()
      .single();

    if (error) throw error;
    return data as MonthlyPrice;
  }

  async updateMonthlyPrice(
    id: string,
    updates: Partial<InsertMonthlyPrice>
  ): Promise<MonthlyPrice | undefined> {
    const { data, error } = await supabase
      .from("monthly_prices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as MonthlyPrice;
  }

  async deleteMonthlyPrice(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("monthly_prices")
      .delete()
      .eq("id", id);

    if (error) {
      if (error.code === "PGRST116") return false; // Not found
      throw error;
    }
    return true;
  }

  async getMonthlyPriceStatus(
    month: string
  ): Promise<MonthlyPriceStatus | undefined> {
    const { data, error } = await supabase
      .from("monthly_price_status")
      .select("*")
      .eq("month", month)
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as MonthlyPriceStatus;
  }

  async setMonthlyPriceStatus(
    status: InsertMonthlyPriceStatus
  ): Promise<MonthlyPriceStatus> {
    const existing = await this.getMonthlyPriceStatus(status.month);

    if (existing) {
      const { data, error } = await supabase
        .from("monthly_price_status")
        .update(status)
        .eq("month", status.month)
        .select()
        .single();

      if (error) throw error;
      return data as MonthlyPriceStatus;
    } else {
      const { data, error } = await supabase
        .from("monthly_price_status")
        .insert(status)
        .select()
        .single();

      if (error) throw error;
      return data as MonthlyPriceStatus;
    }
  }

  // ===== Inventory Snapshots =====
  async getInventorySnapshots(): Promise<InventorySnapshot[]> {
    const { data, error } = await supabase
      .from("inventory_snapshots")
      .select("*");

    if (error) throw error;
    return data as InventorySnapshot[];
  }

  async getInventorySnapshot(
    id: string
  ): Promise<InventorySnapshot | undefined> {
    const { data, error } = await supabase
      .from("inventory_snapshots")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as InventorySnapshot;
  }

  async getInventorySnapshotByMonth(
    month: string
  ): Promise<InventorySnapshot | undefined> {
    const { data, error } = await supabase
      .from("inventory_snapshots")
      .select("*")
      .eq("month", month)
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as InventorySnapshot;
  }

  async createInventorySnapshot(
    snapshot: InsertInventorySnapshot
  ): Promise<InventorySnapshot> {
    const { data, error } = await supabase
      .from("inventory_snapshots")
      .insert(snapshot)
      .select()
      .single();

    if (error) throw error;
    return data as InventorySnapshot;
  }

  async updateInventorySnapshot(
    id: string,
    updates: Partial<InsertInventorySnapshot>
  ): Promise<InventorySnapshot | undefined> {
    // Convert camelCase to snake_case for Supabase
    const snakeCaseUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeCaseUpdates[snakeKey] = value;
    }

    const { data, error } = await supabase
      .from("inventory_snapshots")
      .update(snakeCaseUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as InventorySnapshot;
  }

  async getSnapshotLines(
    snapshotId: string
  ): Promise<InventorySnapshotLine[]> {
    const { data, error } = await supabase
      .from("inventory_snapshot_lines")
      .select("*")
      .eq("snapshot_id", snapshotId);

    if (error) throw error;
    return data as InventorySnapshotLine[];
  }

  async createSnapshotLine(
    line: InsertInventorySnapshotLine
  ): Promise<InventorySnapshotLine> {
    const { data, error } = await supabase
      .from("inventory_snapshot_lines")
      .insert(line)
      .select()
      .single();

    if (error) throw error;
    return data as InventorySnapshotLine;
  }

  async updateSnapshotLine(
    id: string,
    updates: Partial<InsertInventorySnapshotLine>
  ): Promise<InventorySnapshotLine | undefined> {
    const { data, error } = await supabase
      .from("inventory_snapshot_lines")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found
      throw error;
    }
    return data as InventorySnapshotLine;
  }

  /**
   * 월마감 시 차이분에 대한 ADJUSTMENT 트랜잭션 생성 (Phase 14-1)
   * @param month - YYYY-MM 형식의 월
   * @returns 생성된 트랜잭션 ID 또는 null (차이분 없으면)
   */
  async createAdjustmentTransactions(month: string): Promise<string | null> {
    // 1. 스냅샷 조회
    const snapshot = await this.getInventorySnapshotByMonth(month);
    if (!snapshot) return null;

    // 2. 스냅샷 라인 조회
    const lines = await this.getSnapshotLines(snapshot.id);

    // 3. 차이분 필터 (difference_qty 필드 사용 - Supabase returns snake_case)
    const adjustmentLines = lines.filter(line => {
      const lineData = line as any;
      const diff = parseFloat(lineData.difference_qty || lineData.differenceQty || '0');
      return diff !== 0;
    });

    if (adjustmentLines.length === 0) return null;

    // 4. 월말일 계산 (예: 2025-01 → 2025-01-31)
    const [year, mon] = month.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const adjustmentDate = `${month}-${lastDay.toString().padStart(2, '0')}`;

    // 5. ADJUSTMENT 트랜잭션 생성
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert({
        date: adjustmentDate,
        type: 'ADJUSTMENT',
        partner_id: null,
        remarks: `${month} 월마감 재고조정`
      })
      .select()
      .single();

    if (txError) throw txError;

    // 6. 라인 생성 (difference_qty가 그대로 수량 - Supabase snake_case)
    const txLines = adjustmentLines.map(line => {
      const lineData = line as any;
      return {
        transaction_id: tx.id,
        item_id: lineData.item_id || lineData.itemId,
        quantity: lineData.difference_qty || lineData.differenceQty, // +면 증가, -면 감소
        price: null,
        amount: null
      };
    });

    const { error: linesError } = await supabase
      .from('tx_lines')
      .insert(txLines);

    if (linesError) throw linesError;

    return tx.id;
  }

  // ===== BOM 검증 및 재고 체크 메서드 (process.md 원칙 준수) =====

  /**
   * 품목 ID와 월 기준으로 BOM 조회
   * @param productItemId - 생산 품목 ID
   * @param month - YYYY-MM 형식의 월
   * @returns BOM header + lines 또는 null
   */
  async getBomByProductAndMonth(
    productItemId: string,
    month: string
  ): Promise<(BomHeader & { lines: BomLine[] }) | null> {
    const headers = await this.getBomHeaders(month);
    // Supabase returns snake_case, so check both
    const header = headers.find((h: any) =>
      (h.item_id || h.itemId) === productItemId
    );
    if (!header) return null;

    const lines = await this.getBomLines(header.id);
    return { ...header, lines };
  }

  /**
   * 다음 달 문자열 반환 (Phase 14-2)
   * @param month - YYYY-MM 형식
   * @returns 다음 달 YYYY-MM 형식
   */
  private getNextMonth(month: string): string {
    const [year, mon] = month.split('-').map(Number);
    const nextDate = new Date(year, mon, 1); // mon은 0-indexed이므로 다음 달
    return `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  /**
   * CLOSED 상태 스냅샷 중 beforeMonth 이전 가장 최근 라인 조회 (Phase 14-2)
   * @param itemId - 품목 ID
   * @param beforeMonth - 기준월 (이전 월만 조회)
   * @returns 월 + 실사수량 또는 null
   */
  async getLatestClosedSnapshotLine(
    itemId: string,
    beforeMonth: string
  ): Promise<{ month: string; actualQty: string } | null> {
    const { data, error } = await supabase
      .from('inventory_snapshots')
      .select(`
        month,
        status,
        inventory_snapshot_lines!inner(item_id, actual_qty)
      `)
      .eq('status', 'CLOSED')
      .lt('month', beforeMonth)
      .eq('inventory_snapshot_lines.item_id', itemId)
      .order('month', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const snapshot = data[0];
    const line = (snapshot as any).inventory_snapshot_lines?.[0];
    if (!line) return null;

    return {
      month: snapshot.month,
      actualQty: line.actual_qty
    };
  }

  /**
   * 날짜 범위 내 트랜잭션 합산 (Phase 14-2)
   * @param itemId - 품목 ID
   * @param startDate - 시작일 (포함)
   * @param endDate - 종료일 (포함)
   * @returns 합산된 수량
   */
  async sumTransactionsInRange(
    itemId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const { data, error } = await supabase
      .from('tx_lines')
      .select('quantity, transactions!inner(type, date)')
      .eq('item_id', itemId)
      .gte('transactions.date', startDate)
      .lte('transactions.date', endDate);

    if (error) throw error;

    let total = 0;
    for (const row of data ?? []) {
      const qty = Number(row.quantity);
      if (!Number.isFinite(qty)) continue;
      const txType = (row.transactions as any)?.type;
      if (txType) {
        total += this.getTransactionSign(txType) * qty;
      }
    }

    return total;
  }

  /**
   * 특정 품목의 현재 재고 계산 (Phase 14-2: 동적 이월 로직 추가)
   * @param itemId - 품목 ID
   * @param asOfDate - 기준일 (optional, 기본값 오늘)
   * @returns 재고 수량
   */
  async getInventory(itemId: string, asOfDate?: string): Promise<number> {
    const date = asOfDate || new Date().toISOString().split('T')[0];
    const currentMonth = date.substring(0, 7);

    // 1. 이전 월 중 CLOSED된 가장 최근 스냅샷 라인 찾기
    const closedSnapshot = await this.getLatestClosedSnapshotLine(itemId, currentMonth);

    if (closedSnapshot) {
      // 2. 마감된 월이 있으면: 실사재고 + 이후 트랜잭션
      const baseQty = parseFloat(closedSnapshot.actualQty || '0');

      // 다음 달 1일부터 조회 날짜까지
      const nextMonth = this.getNextMonth(closedSnapshot.month);
      const startDate = `${nextMonth}-01`;

      const deltaQty = await this.sumTransactionsInRange(itemId, startDate, date);
      return baseQty + deltaQty;
    }

    // 3. 마감된 월 없으면: 기존 로직 (전체 트랜잭션 합산)
    let query = supabase
      .from("tx_lines")
      .select("quantity, transaction_id, transactions!inner(type, date)")
      .eq("item_id", itemId);

    if (asOfDate) {
      query = query.lte("transactions.date", asOfDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    let quantity = 0;
    for (const row of data ?? []) {
      const qty = Number(row.quantity);
      // NaN 방어 (Codex 리뷰 반영)
      if (!Number.isFinite(qty)) {
        console.warn(`Invalid quantity for item ${itemId}: ${row.quantity}`);
        continue;
      }
      const txType = (row.transactions as any)?.type;
      if (txType) {
        quantity += this.getTransactionSign(txType) * qty;
      }
    }

    return quantity;
  }

  /**
   * 여러 품목의 재고를 한 번에 조회 (Codex 리뷰 반영: 중복 호출 방지)
   * @param itemIds - 품목 ID 배열
   * @param asOfDate - 기준일
   * @returns Map<itemId, quantity>
   */
  async getInventoryByItemIds(
    itemIds: string[],
    asOfDate?: string
  ): Promise<Map<string, number>> {
    if (itemIds.length === 0) {
      return new Map();
    }

    let query = supabase
      .from("tx_lines")
      .select("item_id, quantity, transactions!inner(type, date)")
      .in("item_id", itemIds);

    if (asOfDate) {
      query = query.lte("transactions.date", asOfDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const inventoryMap = new Map<string, number>();

    for (const row of data ?? []) {
      const qty = Number(row.quantity);
      if (!Number.isFinite(qty)) continue;

      const txType = (row.transactions as any)?.type;
      if (!txType) continue;

      const itemId = row.item_id;
      const sign = this.getTransactionSign(txType);
      const current = inventoryMap.get(itemId) ?? 0;
      inventoryMap.set(itemId, current + sign * qty);
    }

    return inventoryMap;
  }

  /**
   * 트랜잭션 타입에 따른 재고 증감 부호 반환
   */
  private getTransactionSign(type: string): number {
    switch (type) {
      case "PURCHASE_RECEIPT":
      case "PRODUCTION_PRESS":
      case "PRODUCTION_WELD":
      case "PRODUCTION_PAINT":
        return 1;
      case "SHIPMENT":
      case "SCRAP_SHIPMENT":
        return -1;
      case "ADJUSTMENT":
        return 1; // 조정은 라인 수량 부호로 처리
      case "TRANSFER":
        return 0;
      default:
        return 0;
    }
  }

  /**
   * 트랜잭션 라인들의 재고 충분 여부 검증 (Codex 리뷰 반영: 일괄 조회)
   * @param lines - 트랜잭션 라인 배열
   * @param txDate - 트랜잭션 날짜
   * @returns 검증 결과 { valid, errors }
   */
  async validateInventoryAvailability(
    lines: Array<{ itemId: string; quantity: string }>,
    txDate: string
  ): Promise<{
    valid: boolean;
    errors: Array<{ itemId: string; available: number; required: number }>;
  }> {
    const errors: Array<{
      itemId: string;
      available: number;
      required: number;
    }> = [];

    // 음수 라인만 필터링 (NaN 방어 포함)
    const negativeLines = lines.filter((l) => {
      const qty = Number(l.quantity);
      return Number.isFinite(qty) && qty < 0;
    });

    if (negativeLines.length === 0) {
      return { valid: true, errors: [] };
    }

    // 필요한 품목들의 재고를 한 번에 조회 (Codex 리뷰 반영: 중복 호출 방지)
    const itemIdSet = new Set(negativeLines.map((l) => l.itemId));
    const itemIds = Array.from(itemIdSet);
    const inventoryMap = await this.getInventoryByItemIds(itemIds, txDate);

    // 동일 품목이 여러 라인에 분산된 경우를 위해 합산
    const requiredByItem = new Map<string, number>();
    for (const line of negativeLines) {
      const qty = Math.abs(Number(line.quantity));
      const current = requiredByItem.get(line.itemId) ?? 0;
      requiredByItem.set(line.itemId, current + qty);
    }

    // 재고 검증
    const requiredEntries = Array.from(requiredByItem.entries());
    for (const entry of requiredEntries) {
      const itemId = entry[0];
      const required = entry[1];
      const available = inventoryMap.get(itemId) ?? 0;
      if (available < required) {
        errors.push({ itemId, available, required });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * BOM 기반 소비량 검증 (PRODUCTION_WELD, PRODUCTION_PAINT 용)
   * 프론트에서 계산한 소비 라인이 BOM과 일치하는지 검증
   * (Codex 리뷰 반영: 합산 처리, 초과 자재 검증, NaN 방어)
   * @param productItemId - 생산 품목 ID
   * @param quantity - 생산 수량
   * @param lines - 프론트에서 전송한 트랜잭션 라인
   * @param month - 기준월
   * @returns 검증 결과
   */
  async validateBomConsumption(
    productItemId: string,
    quantity: number,
    lines: Array<{ itemId: string; quantity: string }>,
    month: string
  ): Promise<{ valid: boolean; error?: string }> {
    // 생산 수량 검증
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { valid: false, error: "유효하지 않은 생산 수량" };
    }

    const bom = await this.getBomByProductAndMonth(productItemId, month);

    // BOM이 없으면 검증 스킵 (원자재 수불 관리 등)
    if (!bom) {
      return { valid: true };
    }

    // BOM이 확정되지 않았으면 경고만 (에러는 아님)
    if (!bom.isFixed) {
      console.warn(`BOM not fixed for ${productItemId} in ${month}`);
    }

    // 소비 라인 합산 (동일 자재가 여러 라인에 분산된 경우 처리)
    const consumed = new Map<string, number>();
    for (const line of lines) {
      const qty = Number(line.quantity);
      // NaN 방어 (Codex 리뷰 반영)
      if (!Number.isFinite(qty)) {
        return { valid: false, error: `유효하지 않은 수량: ${line.itemId}` };
      }
      if (qty < 0) {
        const current = consumed.get(line.itemId) ?? 0;
        consumed.set(line.itemId, current + Math.abs(qty));
      }
    }

    // BOM 자재 ID 세트
    const bomMaterialIds = new Set(bom.lines.map((l) => l.materialId));

    // 각 BOM 라인에 대해 제출된 라인 검증
    for (const bomLine of bom.lines) {
      const bomQty = Number(bomLine.quantity);
      const expectedQty = bomQty * quantity;
      const actualQty = consumed.get(bomLine.materialId) ?? 0;

      // 오차 허용 (부동소수점 비교)
      if (Math.abs(actualQty - expectedQty) > 0.001) {
        return {
          valid: false,
          error: `BOM 수량 불일치: ${bomLine.materialId} (예상: ${expectedQty}, 제출: ${actualQty})`,
        };
      }
    }

    // BOM에 없는 자재가 소비되었는지 검증 (Codex 리뷰 반영)
    const consumedItemIds = Array.from(consumed.keys());
    for (const itemId of consumedItemIds) {
      if (!bomMaterialIds.has(itemId)) {
        return {
          valid: false,
          error: `BOM에 없는 자재 소비: ${itemId}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * BOM 기반 소비 라인 자동 생성 (Phase 15-3)
   * @param bom - BOM header + lines
   * @param quantity - 생산 수량
   * @returns 트랜잭션 라인 배열 (음수 수량)
   */
  generateConsumptionLines(
    bom: (BomHeader & { lines: BomLine[] }) | null,
    quantity: number
  ): Array<{ itemId: string; quantity: string; price: null; amount: null }> {
    if (!bom || !bom.lines || bom.lines.length === 0) {
      return [];
    }

    return bom.lines.map((bomLine: any) => ({
      itemId: bomLine.material_id || bomLine.materialId,
      quantity: (-Number(bomLine.quantity) * quantity).toString(),
      price: null,
      amount: null
    }));
  }
}

export const storage = new SupabaseStorage();
