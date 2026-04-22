// ─── Replace your loadData function in ExpenseTracker.jsx with this ───

const loadData = useCallback(async () => {
  setLoading(true);
  try {
    const [entriesRes, accountsRes, expCatsRes, incCatsRes] = await Promise.all([
      pb.collection("entries").getFullList({ filter: `userId = '${userId}'`, sort: "-date" }),
      pb.collection("accounts").getFullList({ filter: `userId = '${userId}'` }),
      pb.collection("expense_categories").getFullList({ filter: `userId = '${userId}'` }),
      pb.collection("income_categories").getFullList({ filter: `userId = '${userId}'` }),
    ]);

    setEntries(entriesRes);

    if (accountsRes.length === 0) {
      const created = await Promise.all(DEFAULT_ACCOUNTS.map(a => pb.collection("accounts").create({ ...a, userId })));
      setAccounts(created);
      setForm(f => ({ ...f, accountId: created[0]?.id || "" }));
    } else {
      setAccounts(accountsRes);
      setForm(f => ({ ...f, accountId: f.accountId || accountsRes[0]?.id || "" }));
    }

    if (expCatsRes.length === 0) {
      const created = await Promise.all(DEFAULT_EXPENSE_CATEGORIES.map(c => pb.collection("expense_categories").create({ ...c, userId })));
      setExpCats(created);
    } else { setExpCats(expCatsRes); }

    if (incCatsRes.length === 0) {
      const created = await Promise.all(DEFAULT_INCOME_CATEGORIES.map(c => pb.collection("income_categories").create({ ...c, userId })));
      setIncCats(created);
    } else { setIncCats(incCatsRes); }

  } catch (err) {
    console.error("Failed to load data:", err);
  } finally {
    setLoading(false);
  }
}, [userId]);