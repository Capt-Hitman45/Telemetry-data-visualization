import React, { useEffect, useState } from "react";

const Stars = () => {
  console.log("🌟 Stars component is rendering!");
  const [stars, setStars] = useState([]);
  const [fallingStars, setFallingStars] = useState([]);
  const [comets, setComets] = useState([]);

  useEffect(() => {
    console.log("✨ Stars effect triggered!");
    const createStars = () => {
      const newStars = [];
      for (let i = 0; i < 150; i++) {
        newStars.push({
          top: Math.random() * 100 + "vh", // Ensure it spans full viewport height
          left: Math.random() * 100 + "vw", // Full width coverage
          animationDelay: Math.random() * 2 + "s",
        });
      }
      setStars(newStars);
    };

    const createFallingStars = () => {
      const newFallingStars = [];
      for (let i = 0; i < 5; i++) {
        newFallingStars.push({
          top: Math.random() * 50 + "vh",
          left: Math.random() * 100 + "vw",
          animationDuration: Math.random() * 3 + 2 + "s",
          animationDelay: Math.random() * 5 + "s",
        });
      }
      setFallingStars(newFallingStars);
    };

    const createComets = () => {
      const newComets = [];
      for (let i = 0; i < 3; i++) {
        newComets.push({
          top: Math.random() * 80 + "vh",
          left: Math.random() * 100 + "vw",
          animationDuration: Math.random() * 5 + 3 + "s",
          animationDelay: Math.random() * 10 + "s",
        });
      }
      setComets(newComets);
    };

    createStars();
    createFallingStars();
    createComets();
  }, []);

  return (
    <div className="stars-container">
      {/* Twinkling Stars */}
      {stars.map((star, index) => (
        <div
          key={index}
          className="star"
          style={{
            top: star.top,
            left: star.left,
            animationDelay: star.animationDelay,
          }}
        />
      ))}

      {/* Falling Stars */}
      {fallingStars.map((fallingStar, index) => (
        <div
          key={index}
          className="falling-star"
          style={{
            top: fallingStar.top,
            left: fallingStar.left,
            animationDuration: fallingStar.animationDuration,
            animationDelay: fallingStar.animationDelay,
          }}
        />
      ))}

      {/* Comets */}
      {comets.map((comet, index) => (
        <div
          key={index}
          className="comet"
          style={{
            top: comet.top,
            left: comet.left,
            animationDuration: comet.animationDuration,
            animationDelay: comet.animationDelay,
          }}
        />
      ))}
    </div>
  );
};

export default Stars;
