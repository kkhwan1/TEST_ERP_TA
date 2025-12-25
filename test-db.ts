import "dotenv/config";
import { supabase } from "./server/db";

async function test() {
  try {
    console.log("Testing Supabase connection...");

    // Test items
    const { data: items, error: itemsError } = await supabase
      .from("items")
      .select("*")
      .limit(3);

    if (itemsError) {
      console.error("Items error:", itemsError);
    } else {
      console.log("Items found:", items?.length);
      console.log("First item:", items?.[0]);
    }

    // Test partners
    const { data: partners, error: partnersError } = await supabase
      .from("partners")
      .select("*")
      .limit(2);

    if (partnersError) {
      console.error("Partners error:", partnersError);
    } else {
      console.log("Partners found:", partners?.length);
    }

    console.log("\nSupabase connection successful!");
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

test();
