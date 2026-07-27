fetch("http://localhost:3000/api/fix-org")
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
