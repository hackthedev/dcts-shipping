import {mysql, pool, serverconfig} from "../../../index.mjs"

export async function queryDatabase(query, params, retryCount = 3) {
  let connection;

  try {
    connection = await pool.getConnection();
    const [results, ] = await connection.execute(query, params);
    return results;
  } catch (err) {
    if (err.code === 'ER_LOCK_DEADLOCK' && retryCount > 0) {
      console.warn('Deadlock detected, retrying transaction...', retryCount);
      // Wait for a short period before retrying
      await new Promise(resolve => setTimeout(resolve, 100));
      return queryDatabase(query, params, retryCount - 1);
    } else {
      console.error('Error executing query:', err);
      throw err;
    }
  } finally {
    if (connection) connection.release(); // Ensure the connection is released back to the pool
  }
}

export async function checkAndCreateTable(table) {
  const query = `
    SELECT COUNT(*)
    FROM information_schema.tables 
    WHERE table_schema = 'dcts' 
      AND table_name = ?
  `;

  try {
    const results = await queryDatabase(query, [table.name]);
    const tableExists = results[0]['COUNT(*)'] > 0;

    if (tableExists) {
      await checkAndCreateColumns(table);
    } else {
      await createTable(table);
    }
  } catch (err) {
    console.error('Error in checkAndCreateTable:', err);
  }
}

async function createTable(table) {
  const columnsDefinition = table.columns.map(col => `${col.name} ${col.type}`).join(', ');
  const createTableQuery = `
    CREATE TABLE ${table.name} (
      ${columnsDefinition}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `;

  try {
    await queryDatabase(createTableQuery, []);

    if (table.keys) {
      await addKeys(table);
    }
    if (table.autoIncrement) {
      await addAutoIncrement(table);
    }
  } catch (err) {
    console.error('Error in createTable:', err);
  }
}

async function checkAndCreateColumns(table) {
  const query = `
    SELECT COLUMN_NAME
    FROM information_schema.columns
    WHERE table_schema = 'dcts'
      AND table_name = ?
  `;

  try {
    const results = await queryDatabase(query, [table.name]);
    const existingColumns = results.map(row => row.COLUMN_NAME);
    const missingColumns = table.columns.filter(col => !existingColumns.includes(col.name));

    if (missingColumns.length > 0) {
      await addMissingColumns(table.name, missingColumns);
    } else {
    }
  } catch (err) {
    console.error('Error in checkAndCreateColumns:', err);
  }
}

async function addMissingColumns(tableName, columns) {
  const alterTableQueries = columns.map(col => `ADD COLUMN ${col.name} ${col.type}`).join(', ');
  const alterTableQuery = `
    ALTER TABLE ${tableName}
    ${alterTableQueries}
  `;

  try {
    await queryDatabase(alterTableQuery, []);
  } catch (err) {
    console.error('Error in addMissingColumns:', err);
  }
}

async function addKeys(table) {
  const keysQueries = table.keys.map(key => `ADD ${key.name} ${key.type}`).join(', ');
  const keysQuery = `
    ALTER TABLE ${table.name}
    ${keysQueries}
  `;

  try {
    await queryDatabase(keysQuery, []);
  } catch (err) {
    console.error('Error in addKeys:', err);
  }
}

async function addAutoIncrement(table) {
  const autoIncrementQuery = `
    ALTER TABLE ${table.name}
    MODIFY ${table.autoIncrement}
  `;

  try {
    await queryDatabase(autoIncrementQuery, []);
  } catch (err) {
    console.error('Error in addAutoIncrement:', err);
  }
}