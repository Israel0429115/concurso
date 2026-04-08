import { getProvinces, getRecordsByProvince, loadDengueData } from "../src/services/dengue-data.service";

describe("Dengue Data Service", () => {
  describe("loadDengueData", () => {
    it("should load data from CSV", async () => {
      const data = await loadDengueData();
      
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
    });

    it("should have all required fields", async () => {
      const data = await loadDengueData();
      const firstRecord = data[0];
      
      expect(firstRecord.province).toBeDefined();
      expect(firstRecord.year).toBeDefined();
      expect(firstRecord.epi_week).toBeDefined();
      expect(firstRecord.cases).toBeDefined();
      expect(firstRecord.temp_mean_c_synthetic).toBeDefined();
      expect(firstRecord.precip_mm_synthetic).toBeDefined();
      expect(firstRecord.risk_level_rule_based).toBeDefined();
    });
  });

  describe("getProvinces", () => {
    it("should return list of provinces", async () => {
      const provinces = await getProvinces();
      
      expect(provinces).toBeDefined();
      expect(provinces.length).toBeGreaterThan(0);
    });

    it("should include major Ecuadorian provinces", async () => {
      const provinces = await getProvinces();
      
      expect(provinces).toContain("GUAYAS");
      expect(provinces).toContain("PICHINCHA");
      expect(provinces).toContain("AZUAY");
    });
  });

  describe("getRecordsByProvince", () => {
    it("should return records for valid province", async () => {
      const records = await getRecordsByProvince("Guayas");
      
      expect(records).toBeDefined();
      expect(records.length).toBeGreaterThan(0);
    });

    it("should return empty array for invalid province", async () => {
      const records = await getRecordsByProvince("NonExistent");
      
      expect(records).toBeDefined();
      expect(records.length).toBe(0);
    });

    it("should return records sorted by epi_week", async () => {
      const records = await getRecordsByProvince("Guayas");
      
      for (let i = 1; i < records.length; i++) {
        expect(records[i].epi_week).toBeGreaterThanOrEqual(records[i - 1].epi_week);
      }
    });
  });
});
