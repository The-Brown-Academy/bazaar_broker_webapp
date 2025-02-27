import { useState, useEffect } from "react";
const fetchHeroCards = async (hero, size) => {
  try {
    const response = await fetch(`/data/${hero.toLowerCase()}_${size}.json`);
    const data = await response.json();
    return data.Items.map(item => ({
      name: item.Name,
      image: item.ImageUrl,
      size
    }));
  } catch (error) {
    console.error(`Error loading ${size} cards for ${hero}:`, error);
    return [];
  }
};

export default function App() {
  const [enemyDeck, setEnemyDeck] = useState(Array(10).fill(null));
  const [ourDeck, setOurDeck] = useState(Array(10).fill(null));
  const [ourHero, setOurHero] = useState("Vanessa");
  const [enemyHero, setEnemyHero] = useState("Pygmalien");
  const [selectingFor, setSelectingFor] = useState(null);
  const [availableCards, setAvailableCards] = useState([]);
  const [selectingSize, setSelectingSize] = useState(null);

  useEffect(() => {
    if (selectingSize && selectingFor) {
      loadHeroCards(selectingFor.deckType, selectingSize);
    }
  }, [selectingSize]);

  useEffect(() => {
    setOurDeck(Array(10).fill(null)); // Reset only our deck when our hero changes
  }, [ourHero]);

  useEffect(() => {
    setEnemyDeck(Array(10).fill(null)); // Reset only enemy deck when enemy hero changes
  }, [enemyHero]);

  const loadHeroCards = async (deckType, size) => {
    const hero = deckType === "enemy" ? enemyHero : ourHero;
    const cards = await fetchHeroCards(hero, size);
    setAvailableCards(cards);
  };

  const handleCardSelect = (index, deckType, card) => {
    let deck = deckType === "enemy" ? enemyDeck : ourDeck;
    let setDeck = deckType === "enemy" ? setEnemyDeck : setOurDeck;
    let newDeck = [...deck];

    let cardSize = card.size === "medium" ? 2 : card.size === "large" ? 3 : 1;

    // Try placing normally first
    let canPlaceNormally = true;
    for (let i = 0; i < cardSize; i++) {
      if (index + i >= newDeck.length || newDeck[index + i] !== null) {
        canPlaceNormally = false;
        break;
      }
    }

    if (canPlaceNormally) {
      newDeck[index] = card;
      for (let i = 1; i < cardSize; i++) newDeck[index + i] = "merged";
      setDeck(newDeck);
      setSelectingFor(null);
      setSelectingSize(null);
      setAvailableCards([]);
      return;
    }

    // Adjust position if normal placement is blocked
    let adjustedIndex = null;

    if (cardSize === 2) { // Medium Card (2 Slots)
      if ((index + 1 < newDeck.length && newDeck[index + 1] !== null) &&
        index - 1 >= 0 && newDeck[index - 1] === null) {
        adjustedIndex = index - 1; // Move left
      } else if ((index - 1 >= 0 && newDeck[index - 1] !== null) &&
        index + 1 < newDeck.length && newDeck[index + 1] === null) {
        adjustedIndex = index; // Stay in place
      }
    } else if (cardSize === 3) { // Large Card (3 Slots)
      if ((index + 1 < newDeck.length && newDeck[index + 1] !== null) &&
        index - 2 >= 0 &&
        newDeck[index - 1] === null &&
        newDeck[index - 2] === null) {
        adjustedIndex = index - 2; // Shift left
      } else if ((index - 1 >= 0 && newDeck[index - 1] !== null) &&
        index + 2 < newDeck.length &&
        newDeck[index + 1] === null &&
        newDeck[index + 2] === null) {
        adjustedIndex = index; // Stay in place
      }
    }

    // If we found a valid adjusted position, place the card
    if (adjustedIndex !== null) {
      newDeck[adjustedIndex] = card;
      for (let i = 1; i < cardSize; i++) newDeck[adjustedIndex + i] = "merged";
      setDeck(newDeck);
    }

    // Reset selection
    setSelectingFor(null);
    setSelectingSize(null);
    setAvailableCards([]);
  };


  const moveCard = (deckType, index, direction) => {
    let deck = deckType === "enemy" ? enemyDeck : ourDeck;
    let setDeck = deckType === "enemy" ? setEnemyDeck : setOurDeck;
    let newDeck = [...deck];

    if (!newDeck[index] || newDeck[index] === "merged") return; // No card or already merged

    let card = newDeck[index];
    let cardSize = card.size === "medium" ? 2 : card.size === "large" ? 3 : 1;

    // Find leftmost index of the card
    let leftmostIndex = index;
    while (leftmostIndex > 0 && newDeck[leftmostIndex - 1] === "merged") {
      leftmostIndex--;
    }

    let rightmostIndex = leftmostIndex + cardSize - 1;

    let targetLeft = leftmostIndex + direction;
    let targetRight = rightmostIndex + direction;

    // Ensure movement stays within bounds
    if (targetLeft < 0 || targetRight >= newDeck.length) return;

    // Check if target slots are free
    for (let i = 0; i < cardSize; i++) {
      if (newDeck[targetLeft + i] !== null && newDeck[targetLeft + i] !== "merged") return;
    }

    // Clear old slots
    for (let i = 0; i < cardSize; i++) {
      newDeck[leftmostIndex + i] = null;
    }

    // Place new card and merged slots
    newDeck[targetLeft] = card;
    for (let i = 1; i < cardSize; i++) {
      newDeck[targetLeft + i] = "merged";
    }

    setDeck(newDeck);
  };


  const deleteCard = (deckType, index) => {
    let deck = deckType === "enemy" ? enemyDeck : ourDeck;
    let setDeck = deckType === "enemy" ? setEnemyDeck : setOurDeck;
    let newDeck = [...deck];

    if (newDeck[index] && newDeck[index] !== "merged") {
      let cardSize = newDeck[index].size === "medium" ? 2 : newDeck[index].size === "large" ? 3 : 1;

      // Remove the card and its merged slots
      for (let i = 0; i < cardSize; i++) {
        if (index + i < newDeck.length) {
          newDeck[index + i] = null;
        }
      }

      setDeck(newDeck);
    }
  };

  const [cardDetails, setCardDetails] = useState([]);

  const fetchCardDetails = async () => {
    const allCards = [...ourDeck, ...enemyDeck]
      .filter(card => card && card !== "merged")
      .map(card => encodeURIComponent(card.name)) // Encode names for URL safety
      .join(",");

    if (!allCards) return; // No cards selected

    try {
      const response = await fetch(`https://localhost:7165/${allCards}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      setCardDetails(data);
    } catch (error) {
      console.error("Error fetching card details:", error);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-5xl font-extrabold mb-8 text-yellow-400">Bazaar Broker</h1>
      <div className="flex gap-8 mb-6">
        <div>
          <label className="text-lg font-bold">Our Hero:</label>
          <select
            className="ml-2 p-2 rounded bg-gray-700 text-white"
            value={ourHero}
            onChange={(e) => setOurHero(e.target.value)}
          >
            <option value="Vanessa">Vanessa</option>
            <option value="Pygmalien">Pygmalien</option>
            <option value="Dooley">Dooley</option>
          </select>
        </div>

        <div>
          <label className="text-lg font-bold">Enemy Hero:</label>
          <select
            className="ml-2 p-2 rounded bg-gray-700 text-white"
            value={enemyHero}
            onChange={(e) => setEnemyHero(e.target.value)}
          >
            <option value="Vanessa">Vanessa</option>
            <option value="Pygmalien">Pygmalien</option>
            <option value="Dooley">Dooley</option>
          </select>
        </div>
      </div>

      {/* Deck Containers */}
      <div className="w-full max-w-6xl p-6 bg-gray-800 rounded-lg shadow-2xl border border-gray-700">
        {["our", "enemy"].map((deckType) => (
          <div key={deckType} className="mb-8 p-4 bg-gray-700 rounded-lg shadow-md w-full">
            <h3 className={`text-2xl font-semibold mb-3 ${deckType === "enemy" ? "text-red-400" : "text-blue-400"}`}>
              {deckType === "enemy" ? "Enemy Deck" : "Our Deck"}
            </h3>

            {/* Center-aligned Slots */}
            <div className="flex justify-center gap-2">
              {(deckType === "enemy" ? enemyDeck : ourDeck).map((card, index) => (
                <div
                  key={index}
                  className={`relative flex items-center justify-center border-2 rounded-md cursor-pointer ${card === "merged" ? "hidden" : ""}`}
                  style={{
                    width: card && card !== "merged" ? `${(card.size === "medium" ? 2 : card.size === "large" ? 3 : 1) * 80}px` : "80px",
                    height: "120px",
                    backgroundColor: card ? "transparent" : "gray",
                  }}
                  onClick={() => !card && setSelectingFor({ deckType, index })}
                >
                  {card && card !== "merged" ? (
                    <>
                      <img src={card.image} alt={card.name} className="w-full h-full object-cover rounded-md" />
                      <div className="absolute top-1/2 transform -translate-y-1/2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                        <button className="bg-blue-500 p-1 rounded text-white" onClick={() => moveCard(deckType, index, -1)}>←</button>
                        <button className="bg-red-500 p-1 rounded text-white" onClick={() => deleteCard(deckType, index)}>X</button>
                        <button className="bg-blue-500 p-1 rounded text-white" onClick={() => moveCard(deckType, index, 1)}>→</button>
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-300 text-2xl">+</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Card Selection Popup */}
      {selectingFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-y-auto relative">
            <button className="absolute top-3 right-3 bg-red-600 text-white p-2 rounded" onClick={() => setSelectingFor(null)}>✖</button>

            {!selectingSize ? (
              <>
                <h3 className="text-xl font-semibold text-gray-300 mb-4">Select Card Size</h3>
                <div className="flex gap-4 mb-4">
                  {["small", "medium", "large"].map(size => (
                    <button key={size} className="bg-gray-600 p-3 rounded-lg text-white" onClick={() => {
                      setSelectingSize(size)
                      console.log(size);
                    }}>{size}</button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-gray-300 mb-4">Select a Card</h3>
                <div className="grid grid-cols-2 gap-4">
                  {availableCards.map((card, i) => (
                    <div key={i} className="flex items-center p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
                      onClick={() => handleCardSelect(selectingFor.index, selectingFor.deckType, card)}>
                      <img src={card.image} alt={card.name} className="w-12 h-12 rounded-md mr-2" />
                      <span className="text-white">{card.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* "Get Info" Button */}
      <button
        className="mt-6 p-3 bg-yellow-500 text-black rounded-lg font-bold hover:bg-yellow-600"
        onClick={async () => {
          await fetchCardDetails();
          console.log("Fetched Card Details:", cardDetails);
        }}
      >
        Get Info
      </button>

      {/* Display Card Details */}
      {cardDetails.length > 0 && (
        <div className="mt-6 p-4 bg-gray-800 rounded-lg max-w-2xl text-white">
          <h2 className="text-xl font-bold mb-3">Card Details</h2>
          <ul className="space-y-2">
            {cardDetails.map((detail, index) => (
              <li key={index} className="p-2 bg-gray-700 rounded">
                <strong>{detail.name}</strong>: {detail.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
