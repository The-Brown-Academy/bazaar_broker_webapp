import { useState, useEffect, useRef } from "react";

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
  const [cardDetails, setCardDetails] = useState({ myDeck: [], enemyDeck: [] });
  const [draggingCard, setDraggingCard] = useState(null);
  const [dragOrigin, setDragOrigin] = useState(null);

  useEffect(() => {
    if (selectingSize && selectingFor) {
      loadHeroCards(selectingFor.deckType, selectingSize);
    }
  }, [selectingSize]);

  useEffect(() => {
    setOurDeck(Array(10).fill(null));
  }, [ourHero]);

  useEffect(() => {
    setEnemyDeck(Array(10).fill(null));
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

  // Find the actual index of the card (not a merged slot)
  const findCardParentIndex = (deck, index) => {
    let i = index;
    while (i >= 0 && deck[i] === "merged") {
      i--;
    }
    return i;
  };

  // Find the size of the card at the given index
  const getCardSize = (card) => {
    if (!card || card === "merged") return 0;
    return card.size === "medium" ? 2 : card.size === "large" ? 3 : 1;
  };

  // Check if we can place a card at the given index
  const canPlaceCardAt = (deck, card, targetIndex) => {
    if (!card || card === "merged") return false;
    
    const cardSize = getCardSize(card);
    
    // Check if we have enough space
    for (let i = 0; i < cardSize; i++) {
      if (targetIndex + i >= deck.length || (deck[targetIndex + i] !== null && deck[targetIndex + i] !== "merged")) {
        return false; // Not enough slots or slots are occupied
      }
    }
    
    return true;
  };

  // Handle drag start
  const handleDragStart = (e, deckType, index) => {
    e.dataTransfer.effectAllowed = "move";
    
    const deck = deckType === "enemy" ? enemyDeck : ourDeck;
    
    // Find the real card index if this is a merged slot
    const actualIndex = deck[index] === "merged" ? 
      findCardParentIndex(deck, index) : index;
    
    if (actualIndex < 0 || !deck[actualIndex] || deck[actualIndex] === "merged") {
      return;
    }
    
    // Store information about what we're dragging
    setDraggingCard({
      card: deck[actualIndex],
      index: actualIndex
    });
    
    setDragOrigin({
      deckType,
      index: actualIndex
    });
    
    // Set a small delay to make the dragged item visible for a moment
    setTimeout(() => {
      e.target.style.opacity = "0.4";
    }, 0);
  };

  // Handle drag over
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Handle drop - FIXED VERSION
  const handleDrop = (e, deckType, index) => {
    e.preventDefault();
    
    // If we're not dragging anything, do nothing
    if (!draggingCard || !dragOrigin) return;
    
    const sourceDeckType = dragOrigin.deckType;
    const targetDeckType = deckType;
    
    const sourceDeck = sourceDeckType === "enemy" ? enemyDeck : ourDeck;
    const targetDeck = targetDeckType === "enemy" ? enemyDeck : ourDeck;
    
    const setSourceDeck = sourceDeckType === "enemy" ? setEnemyDeck : setOurDeck;
    const setTargetDeck = targetDeckType === "enemy" ? setEnemyDeck : setOurDeck;
    
    // Create copies of the decks
    let newSourceDeck = [...sourceDeck];
    let newTargetDeck = [...targetDeck];
    
    const sourceCard = draggingCard.card;
    const sourceIndex = draggingCard.index;
    const sourceCardSize = getCardSize(sourceCard);
    
    // Determine the target index (if it's a merged cell, find its parent)
    let targetIndex = index;
    if (targetDeck[targetIndex] === "merged") {
      targetIndex = findCardParentIndex(targetDeck, targetIndex);
    }
    
    // Don't do anything if dropping on the same card
    if (targetDeckType === sourceDeckType && targetIndex === sourceIndex) {
      return;
    }
    
    // If dropping on another card
    if (targetDeck[targetIndex] && targetDeck[targetIndex] !== "merged") {
      const targetCard = targetDeck[targetIndex];
      const targetCardSize = getCardSize(targetCard);
      
      // Same deck swapping
      if (targetDeckType === sourceDeckType) {
        // Clear both cards from the deck first
        for (let i = 0; i < sourceCardSize; i++) {
          if (sourceIndex + i < newSourceDeck.length) {
            newSourceDeck[sourceIndex + i] = null;
          }
        }
        
        for (let i = 0; i < targetCardSize; i++) {
          if (targetIndex + i < newTargetDeck.length) {
            newTargetDeck[targetIndex + i] = null;
          }
        }
        
        // Try to place the target card in the source position
        if (canPlaceCardAt(newSourceDeck, targetCard, sourceIndex)) {
          newSourceDeck[sourceIndex] = targetCard;
          for (let i = 1; i < targetCardSize; i++) {
            newSourceDeck[sourceIndex + i] = "merged";
          }
        }
        
        // Try to place the source card in the target position
        if (canPlaceCardAt(newTargetDeck, sourceCard, targetIndex)) {
          newTargetDeck[targetIndex] = sourceCard;
          for (let i = 1; i < sourceCardSize; i++) {
            newTargetDeck[targetIndex + i] = "merged";
          }
        }
        
        setSourceDeck(newSourceDeck);
        if (sourceDeckType !== targetDeckType) {
          setTargetDeck(newTargetDeck);
        }
      }
      // Cross-deck operations (not implemented in this example)
    } 
    // If dropping on an empty slot
    else if (!targetDeck[targetIndex]) {
      // Remove the source card first
      for (let i = 0; i < sourceCardSize; i++) {
        if (sourceIndex + i < newSourceDeck.length) {
          newSourceDeck[sourceIndex + i] = null;
        }
      }
      
      // Then place it at the target position if possible
      if (canPlaceCardAt(newTargetDeck, sourceCard, targetIndex)) {
        newTargetDeck[targetIndex] = sourceCard;
        for (let i = 1; i < sourceCardSize; i++) {
          if (targetIndex + i < newTargetDeck.length) {
            newTargetDeck[targetIndex + i] = "merged";
          }
        }
      }
      
      // Update the decks
      setSourceDeck(newSourceDeck);
      if (sourceDeckType !== targetDeckType) {
        setTargetDeck(newTargetDeck);
      }
    }
    
    // Reset dragging state
    setDraggingCard(null);
    setDragOrigin(null);
  };
  
  const handleDragEnd = (e) => {
    e.target.style.opacity = "1";
    setDraggingCard(null);
    setDragOrigin(null);
  };

  const fetchCardDetails = async () => {
    // Extract non-null cards from both decks
    const ourFilteredDeck = ourDeck.filter(card => card && card !== "merged");
    const enemyFilteredDeck = enemyDeck.filter(card => card && card !== "merged");

    const fetchCards = async (deck) => {
      if (!deck || deck.length === 0) return [];
      
      const uniqueCardNames = [...new Set(deck.map((card) => card.name))];
      const requests = uniqueCardNames.map((cardName) =>
        fetch(`https://bazaar-broker-api.azurewebsites.net/${encodeURIComponent(cardName)}`)
          .then((res) => res.json())
          .catch(() => null)
      );

      return (await Promise.all(requests)).filter((res) => res !== null);
    };

    const myDeckDetails = await fetchCards(ourFilteredDeck);
    const enemyDeckDetails = await fetchCards(enemyFilteredDeck);

    setCardDetails({ myDeck: myDeckDetails, enemyDeck: enemyDeckDetails });
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
                  className={`relative flex items-center justify-center border-2 rounded-md transition-all duration-200
                    ${card === "merged" ? "hidden" : ""}
                    ${selectingFor && selectingFor.index === index ? "border-yellow-400 bg-gray-600" : ""} 
                    ${card ? "hover:border-yellow-300 cursor-grab group" : "hover:border-yellow-300 cursor-pointer"}`}
                  style={{
                    width: card && card !== "merged" ? `${(card.size === "medium" ? 2 : card.size === "large" ? 3 : 1) * 80}px` : "80px",
                    height: "120px",
                    backgroundColor: card ? "transparent" : "gray",
                    opacity: dragOrigin && dragOrigin.deckType === deckType && 
                      ((card && card !== "merged" && dragOrigin.index === index) || 
                       (card === "merged" && dragOrigin.index === findCardParentIndex(deckType === "enemy" ? enemyDeck : ourDeck, index))) 
                      ? "0.4" : "1"
                  }}
                  onClick={() => {
                    if (!card) {
                      setSelectingFor({ deckType, index });
                      setSelectingSize(null);
                    }
                  }}
                  draggable={card && card !== "merged"}
                  onDragStart={(e) => handleDragStart(e, deckType, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, deckType, index)}
                  onDragEnd={handleDragEnd}
                >              
                  {card && card !== "merged" ? (
                    <>
                      <img src={card.image} alt={card.name} className="w-full h-full object-cover rounded-md" />
                      {/* Updated delete button to cover the whole card when hovering */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="bg-red-500 p-2 rounded text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCard(deckType, index);
                          }}
                        >
                          Delete
                        </button>
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
                      setSelectingSize(size);
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

      <div className="p-4">
      {/* Existing deck UI */}
      <button onClick={fetchCardDetails} className="mt-4 p-2 bg-blue-500 text-white rounded">
        Get Info
      </button>

      {/* Table for Card Details */}
      {cardDetails.myDeck.length > 0 || cardDetails.enemyDeck.length > 0 ? (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4 text-center text-gray-800">Card Details</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* My Deck Table */}
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-bold mb-2 text-center text-gray-800">My Deck</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 rounded-lg">
                  <thead>
                    <tr className="bg-blue-200">
                      <th className="border border-gray-300 p-2">Name</th>
                      <th className="border border-gray-300 p-2">Size</th>
                      <th className="border border-gray-300 p-2">Collection</th>
                      <th className="border border-gray-300 p-2">Types</th>
                      <th className="border border-gray-300 p-2">Cooldown (ms)</th>
                      <th className="border border-gray-300 p-2">Stats</th>
                      <th className="border border-gray-300 p-2">Effects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardDetails.myDeck.map((card, index) => (
                      <tr key={index} className="hover:bg-gray-100">
                        <td className="border border-gray-300 p-2 text-gray-800">{card.name}</td>
                        <td className="border border-gray-300 p-2 text-gray-800">{card.size}</td>
                        <td className="border border-gray-300 p-2 text-gray-800">{card.collection}</td>
                        <td className="border border-gray-300 p-2 text-gray-800">{card.types.join(", ")}</td>
                        <td className="border border-gray-300 p-2 text-gray-800">{card.baseCooldownsMS.join(", ")}</td>
                        <td className="border border-gray-300 p-2 text-gray-800">
                          {Object.entries(card.stats)
                            .map(([key, value]) => `${key}: ${value.join(", ")}`)
                            .join(" | ")}
                        </td>
                        <td className="border border-gray-300 p-2 text-gray-800">
                          {card.effects
                            .map((effect) => `${effect.description} (Triggers: ${effect.triggers.join(", ")})`)
                            .join(" | ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Enemy Deck Table */}
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-bold mb-2 text-center text-gray-800">Enemy Deck</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 rounded-lg">
                  <thead>
                    <tr className="bg-red-200">
                      <th className="border border-gray-300 p-2">Name</th>
                      <th className="border border-gray-300 p-2">Size</th>
                      <th className="border border-gray-300 p-2">Collection</th>
                      <th className="border border-gray-300 p-2">Types</th>
                      <th className="border border-gray-300 p-2">Cooldown (ms)</th>
                      <th className="border border-gray-300 p-2">Stats</th>
                      <th className="border border-gray-300 p-2">Effects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardDetails.enemyDeck.map((card, index) => (
                      <tr key={index} className="hover:bg-gray-100">
                        <td className="border border-gray-300 p-2 text-gray-800">{card.name}</td>
                        <td className="border border-gray-300 p-2 text-gray-800">{card.size}</td>
                        <td className="border border-gray-300 p-2 text-gray-800">{card.collection}</td>
                        <td className="border border-gray-300 p-2 text-gray-800">{card.types.join(", ")}</td>
                        <td className="border border-gray-300 p-2 text-gray-800">{card.baseCooldownsMS.join(", ")}</td>
                        <td className="border border-gray-300 p-2 text-gray-800">
                          {Object.entries(card.stats)
                            .map(([key, value]) => `${key}: ${value.join(", ")}`)
                            .join(" | ")}
                        </td>
                        <td className="border border-gray-300 p-2 text-gray-800">
                          {card.effects
                            .map((effect) => `${effect.description} (Triggers: ${effect.triggers.join(", ")})`)
                            .join(" | ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </div>
  );
}