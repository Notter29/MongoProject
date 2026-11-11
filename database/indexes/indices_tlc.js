const db = db.getSiblingDB('nyc_taxi_analytics');
const trips = db.getCollection('yellow_trips');

printjson(db.runCommand({
  createIndexes: 'yellow_trips',
  indexes: [
    {
      key: { pickup_datetime: -1 },
      name: 'idx_pickup_datetime'
    }
  ]
}));

db.getCollection('taxi_zones').createIndex(
  { borough: 1, zone: 1 },
  { name: 'idx_taxi_zone_name' }
);

printjson(trips.getIndexes());
